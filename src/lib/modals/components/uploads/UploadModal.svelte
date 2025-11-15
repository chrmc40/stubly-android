<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { modalStore } from '$lib/modals/modalStore.svelte';

	export let path: string[];
	export let onComplete: (result?: any) => void;
	export let autoOpenFileInput: boolean = false;

	let files: File[] = [];
	let uploading = false;
	let error = '';
	let progress = 0;
	let uploadedCount = 0;
	let totalFiles = 0;
	let totalBytesToUpload = 0;
	let bytesUploadedOverall = 0;
	let activeUploadXHRs: XMLHttpRequest[] = [];
	let processingServerSide = false;
	let fileInputRef: HTMLInputElement;

	onMount(() => {
		if (autoOpenFileInput && fileInputRef) {
			fileInputRef.click();
		}
	});

	onDestroy(() => {
		// Cleanup any active uploads
		activeUploadXHRs.forEach((xhr) => xhr.abort());
	});

	function humanizeBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
	}

	function handleFileChange(e: Event) {
		const selectedFiles = (e.target as HTMLInputElement).files;
		files = selectedFiles ? Array.from(selectedFiles) : [];
		error = '';
		totalFiles = files.length;
		uploadedCount = 0;
		progress = 0;
		totalBytesToUpload = files.reduce((sum, file) => sum + file.size, 0);
		bytesUploadedOverall = 0;
	}

	async function upload() {
		console.log('[UploadModal] Upload function called, files:', files.length);

		try {
			if (files.length === 0) {
				error = 'Please select at least one file';
				console.log('[UploadModal] No files selected, returning early');
				return;
			}

			console.log('[UploadModal] Setting uploading = true');
			uploading = true;
			error = '';
			progress = 0;
			uploadedCount = 0;
			bytesUploadedOverall = 0;

			// Small delay to ensure UI updates before starting uploads
			await new Promise((resolve) => setTimeout(resolve, 100));

			const uploadPromises: Promise<void>[] = [];
			const errors: string[] = [];

			console.log('[UploadModal] Starting upload loop for', files.length, 'files');

			// Track progress for each file individually
			const fileProgress: { [key: string]: number } = {};

			// Track actual uploaded filenames
			const actualUploadedFiles: string[] = [];

			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				fileProgress[file.name] = 0;

				console.log(
					`[UploadModal] Starting upload for file ${i + 1}/${files.length}: ${file.name} (${humanizeBytes(file.size)})`
				);

				const formData = new FormData();
				formData.append('path', JSON.stringify(path));
				formData.append('file', file);

				const uploadPromise = new Promise<void>(async (resolve) => {
					const xhr = new XMLHttpRequest();
					activeUploadXHRs.push(xhr);
					xhr.open('POST', '/api/upload');

					// Get session token and add to headers
					const { supabase } = await import('$lib/config/supabase');
					const { data: { session } } = await supabase.auth.getSession();
					if (session?.access_token) {
						xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
					}

					xhr.upload.onprogress = (event) => {
						if (event.lengthComputable) {
							const previousBytes = fileProgress[file.name];
							const currentBytes = event.loaded;
							const diffBytes = currentBytes - previousBytes;

							bytesUploadedOverall += diffBytes;
							fileProgress[file.name] = currentBytes;

							progress = Math.round((bytesUploadedOverall / totalBytesToUpload) * 100);

							// If we hit 100%, show processing state
							if (progress >= 100 && currentBytes >= file.size) {
								processingServerSide = true;
							}

							console.log(
								`[UploadModal] Progress update: ${file.name} - ${Math.round((currentBytes / file.size) * 100)}% | Total: ${progress}%`
							);
						}
					};

					xhr.onload = () => {
						const index = activeUploadXHRs.indexOf(xhr);
						if (index > -1) activeUploadXHRs.splice(index, 1);

						if (xhr.status >= 200 && xhr.status < 300) {
							uploadedCount++;
							// Ensure final progress for this file is accounted for
							bytesUploadedOverall += file.size - fileProgress[file.name];
							fileProgress[file.name] = file.size;
							progress = Math.round((bytesUploadedOverall / totalBytesToUpload) * 100);
							console.log(
								`[UploadModal] File completed: ${file.name} | Total progress: ${progress}% | Uploaded: ${uploadedCount}/${totalFiles}`
							);

							// Parse response to get actual uploaded file info
							try {
								const response = JSON.parse(xhr.responseText);
								if (response.file_id) {
									actualUploadedFiles.push(response.file_id);
									console.log(`[UploadModal] File uploaded with file_id:`, response.file_id);
								}
							} catch (parseError) {
								console.warn(`[UploadModal] Failed to parse upload response:`, parseError);
								actualUploadedFiles.push(file.name);
							}
						} else {
							console.error(
								`[UploadModal] Upload failed for ${file.name}: ${xhr.status} ${xhr.responseText}`
							);
							errors.push(`Failed to upload ${file.name}: ${xhr.responseText || 'Server error'}`);
						}
						resolve();
					};

					xhr.onerror = () => {
						const index = activeUploadXHRs.indexOf(xhr);
						if (index > -1) activeUploadXHRs.splice(index, 1);

						errors.push(`Failed to upload ${file.name}: Network error`);
						resolve();
					};

					xhr.onabort = () => {
						const index = activeUploadXHRs.indexOf(xhr);
						if (index > -1) activeUploadXHRs.splice(index, 1);
						errors.push(`Upload of ${file.name} was cancelled.`);
						resolve();
					};

					xhr.send(formData);
				});
				uploadPromises.push(uploadPromise);

				console.log(
					`[UploadModal] Added upload promise for ${file.name}. Total promises: ${uploadPromises.length}`
				);
			}

			// Wait for all uploads to complete
			console.log('[UploadModal] Waiting for all uploads to complete...');
			await Promise.all(uploadPromises);

			console.log('[UploadModal] All uploads completed.');

			if (errors.length > 0) {
				uploading = false;
				error = `Some files failed to upload:\n${errors.join('\n')}`;
				onComplete?.({ success: false, errors });
			} else {
				uploading = false;
				console.log('[UploadModal] Upload complete, closing modal...');
				onComplete?.({ success: true, uploadedFiles: actualUploadedFiles, count: actualUploadedFiles.length });
				// Close the modal after successful upload
				modalStore.close();
			}
		} catch (uploadError) {
			console.error('[UploadModal] Upload function error:', uploadError);
			uploading = false;
			error = `Upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
		}
	}

	function close() {
		if (uploading) {
			// Abort all active uploads
			activeUploadXHRs.forEach((xhr) => xhr.abort());
			uploading = false;
			progress = 0;
			uploadedCount = 0;
			bytesUploadedOverall = 0;
			error = 'Upload cancelled by user.';
		}
		onComplete?.({ success: false, status: 'cancelled' });
	}
</script>

<div class="modal-container" role="dialog" aria-modal="true" aria-label="Upload Files">
	<button type="button" class="backdrop" onclick={close} aria-label="Close upload dialog"></button>

	<div class="modal-content">
		<h2>Upload to {path.length ? '/' + path.join('/') : '/'}</h2>

		<input type="file" multiple onchange={handleFileChange} disabled={uploading} bind:this={fileInputRef} />

		{#if error}
			<p class="error-message">{error}</p>
		{/if}

		{#if uploading}
			{#if processingServerSide}
				<p>Processing files on server (uploading to cloud storage)...</p>
				<progress></progress>
			{:else}
				<p>Uploading {uploadedCount} of {totalFiles} files… {progress}%</p>
				<p>{humanizeBytes(bytesUploadedOverall)} / {humanizeBytes(totalBytesToUpload)}</p>
				<progress value={progress} max="100"></progress>
			{/if}
		{/if}

		<div class="actions">
			<button type="button" onclick={close} disabled={uploading}>Cancel</button>
			<button type="button" onclick={upload} disabled={uploading}>
				{#if uploading}
					Uploading...
				{:else}
					Upload
				{/if}
			</button>
		</div>
	</div>
</div>

<style>
	.modal-container {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		animation: fadeIn 0.2s ease both;
	}

	.backdrop {
		all: unset;
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		cursor: pointer;
	}

	.modal-content {
		position: relative;
		z-index: 1;
		background: #222;
		padding: 24px;
		border-radius: 6px;
		width: 90%;
		max-width: 360px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
		animation: fadeIn 0.2s ease both;
		color: #eee;
	}

	.error-message {
		margin: 6px 0;
		color: #ff7070;
		font-size: 0.85em;
	}

	progress {
		width: 100%;
		height: 8px;
		margin-top: 4px;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 16px;
	}

	.actions button {
		margin-left: 8px;
		padding: 6px 14px;
		background: #444;
		color: #eee;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.actions button:hover {
		background: #555;
	}

	.actions button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
