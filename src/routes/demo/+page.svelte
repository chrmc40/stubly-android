<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Dropdown from '$lib/components/ui/Dropdown.svelte';
	import DatePicker from '$lib/components/forms/DatePicker.svelte';

	// Lucide icons
	import {
		Folder,
		FolderPlus,
		FolderOpen,
		File,
		FileText,
		Files,
		Copy,
		Move,
		Trash2,
		Edit,
		Scissors,
		Tag,
		Bookmark,
		Pin,
		Clipboard,
		Inbox,
		Image,
		Video,
		Download,
		Upload,
		FileDown,
		Search,
		Settings,
		Check,
		X,
		XCircle,
		Ban,
		ChevronDown,
		ChevronUp,
		ChevronLeft,
		ChevronRight,
		ArrowDown,
		MoreVertical,
		PlusCircle,
		Grid,
		List,
		ArrowUpAZ,
		ArrowDownZA,
		Filter,
		Play,
		Pause,
		Square,
		RefreshCw,
		LogOut,
		Heart,
		Star,
		Zap,
		Menu,
		Bell,
		Home,
		User,
		Mail,
		Phone,
		MapPin,
		Camera,
		Music,
		Plus,
		Minus,
		AlertCircle,
		Info,
		Clock
	} from 'lucide-svelte';

	let modalOpen = $state(false);
	let confirmModalOpen = $state(false);
	let selectedFruit = $state('');
	let selectedCountry = $state('');
	let birthDate = $state('');

	const fruits = [
		{ value: 'apple', label: '🍎 Apple' },
		{ value: 'banana', label: '🍌 Banana' },
		{ value: 'orange', label: '🍊 Orange' },
		{ value: 'grape', label: '🍇 Grape' },
		{ value: 'watermelon', label: '🍉 Watermelon' }
	];

	const countries = [
		{ value: 'us', label: '🇺🇸 United States' },
		{ value: 'uk', label: '🇬🇧 United Kingdom' },
		{ value: 'ca', label: '🇨🇦 Canada' },
		{ value: 'au', label: '🇦🇺 Australia' },
		{ value: 'jp', label: '🇯🇵 Japan' }
	];
</script>

<div class="demo-container">
	<header class="demo-header">
		<h1>Component Demo</h1>
		<p>Testing all components with icons and emojis</p>
	</header>

	<!-- Modals Section -->
	<section class="demo-section">
		<h2>🎭 Modals</h2>
		<div class="button-group">
			<button class="demo-btn primary" onclick={() => (modalOpen = true)}>
				<Plus size={20} />
				Open Info Modal
			</button>
			<button class="demo-btn danger" onclick={() => (confirmModalOpen = true)}>
				<AlertCircle size={20} />
				Open Confirm Dialog
			</button>
		</div>
	</section>

	<!-- Dropdowns Section -->
	<section class="demo-section">
		<h2>📋 Dropdowns</h2>
		<div class="input-grid">
			<div>
				<div class="label">Select Fruit</div>
				<Dropdown bind:value={selectedFruit} options={fruits} placeholder="Pick your fruit..." />
				{#if selectedFruit}
					<p class="selected-value">Selected: {selectedFruit}</p>
				{/if}
			</div>
			<div>
				<div class="label">Select Country</div>
				<Dropdown
					bind:value={selectedCountry}
					options={countries}
					placeholder="Choose country..."
				/>
				{#if selectedCountry}
					<p class="selected-value">Selected: {selectedCountry}</p>
				{/if}
			</div>
		</div>
	</section>

	<!-- DatePicker Section -->
	<section class="demo-section">
		<h2>📅 Date Picker</h2>
		<div class="input-grid">
			<div>
				<div class="label">Birth Date</div>
				<DatePicker bind:value={birthDate} placeholder="Select your birthday..." />
				{#if birthDate}
					<p class="selected-value">Selected: {birthDate}</p>
				{/if}
			</div>
		</div>
	</section>

	<!-- Your SN5 Icons - File Operations -->
	<section class="demo-section">
		<h2>📁 File & Folder Icons (from sn5)</h2>
		<div class="icon-grid">
			<div class="icon-item">
				<Folder size={32} />
				<span>Folder</span>
			</div>
			<div class="icon-item">
				<FolderPlus size={32} />
				<span>FolderPlus</span>
			</div>
			<div class="icon-item">
				<FolderOpen size={32} />
				<span>FolderOpen</span>
			</div>
			<div class="icon-item">
				<File size={32} />
				<span>File</span>
			</div>
			<div class="icon-item">
				<FileText size={32} />
				<span>FileText</span>
			</div>
			<div class="icon-item">
				<Files size={32} />
				<span>FileCopy</span>
			</div>
			<div class="icon-item">
				<FileDown size={32} />
				<span>FileDown</span>
			</div>
			<div class="icon-item">
				<Image size={32} />
				<span>Image</span>
			</div>
			<div class="icon-item">
				<Video size={32} />
				<span>Video</span>
			</div>
		</div>
	</section>

	<!-- File Actions -->
	<section class="demo-section">
		<h2>⚡ File Actions (from sn5)</h2>
		<div class="icon-grid">
			<div class="icon-item">
				<Copy size={32} />
				<span>Copy</span>
			</div>
			<div class="icon-item">
				<Move size={32} />
				<span>Move</span>
			</div>
			<div class="icon-item">
				<Trash2 size={32} />
				<span>Delete</span>
			</div>
			<div class="icon-item">
				<Edit size={32} />
				<span>Rename</span>
			</div>
			<div class="icon-item">
				<Scissors size={32} />
				<span>Scissors</span>
			</div>
			<div class="icon-item">
				<Download size={32} />
				<span>Download</span>
			</div>
			<div class="icon-item">
				<Upload size={32} />
				<span>Upload</span>
			</div>
			<div class="icon-item">
				<Tag size={32} />
				<span>Tag</span>
			</div>
			<div class="icon-item">
				<Bookmark size={32} />
				<span>Bookmark</span>
			</div>
			<div class="icon-item">
				<Pin size={32} />
				<span>Pin</span>
			</div>
			<div class="icon-item">
				<Clipboard size={32} />
				<span>Clipboard</span>
			</div>
			<div class="icon-item">
				<Inbox size={32} />
				<span>Inbox</span>
			</div>
		</div>
	</section>

	<!-- UI Controls -->
	<section class="demo-section">
		<h2>🎛️ UI Controls (from sn5)</h2>
		<div class="icon-grid">
			<div class="icon-item">
				<Search size={32} />
				<span>Search</span>
			</div>
			<div class="icon-item">
				<Settings size={32} />
				<span>Settings</span>
			</div>
			<div class="icon-item">
				<Filter size={32} />
				<span>Filter</span>
			</div>
			<div class="icon-item">
				<Check size={32} />
				<span>Check</span>
			</div>
			<div class="icon-item">
				<X size={32} />
				<span>Cancel</span>
			</div>
			<div class="icon-item">
				<XCircle size={32} />
				<span>Close</span>
			</div>
			<div class="icon-item">
				<Ban size={32} />
				<span>Ban</span>
			</div>
			<div class="icon-item">
				<PlusCircle size={32} />
				<span>Add</span>
			</div>
			<div class="icon-item">
				<ChevronDown size={32} />
				<span>Chevron</span>
			</div>
			<div class="icon-item">
				<ArrowDown size={32} />
				<span>ArrowDown</span>
			</div>
			<div class="icon-item">
				<MoreVertical size={32} />
				<span>More</span>
			</div>
			<div class="icon-item">
				<RefreshCw size={32} />
				<span>Refresh</span>
			</div>
		</div>
	</section>

	<!-- View & Sort -->
	<section class="demo-section">
		<h2>👁️ View & Sort (from sn5)</h2>
		<div class="icon-grid">
			<div class="icon-item">
				<Grid size={32} />
				<span>Grid</span>
			</div>
			<div class="icon-item">
				<List size={32} />
				<span>List</span>
			</div>
			<div class="icon-item">
				<ArrowUpAZ size={32} />
				<span>Sort A-Z</span>
			</div>
			<div class="icon-item">
				<ArrowDownZA size={32} />
				<span>Sort Z-A</span>
			</div>
		</div>
	</section>

	<!-- Media Controls -->
	<section class="demo-section">
		<h2>▶️ Media Controls (from sn5)</h2>
		<div class="icon-grid">
			<div class="icon-item">
				<Play size={32} />
				<span>Play</span>
			</div>
			<div class="icon-item">
				<Pause size={32} />
				<span>Pause</span>
			</div>
			<div class="icon-item">
				<Square size={32} />
				<span>Stop</span>
			</div>
		</div>
	</section>

	<!-- Additional Common Icons -->
	<section class="demo-section">
		<h2>✨ Additional Icons</h2>
		<div class="icon-grid">
			<div class="icon-item">
				<Heart size={32} />
				<span>Heart</span>
			</div>
			<div class="icon-item">
				<Star size={32} />
				<span>Star</span>
			</div>
			<div class="icon-item">
				<Zap size={32} />
				<span>Zap</span>
			</div>
			<div class="icon-item">
				<Menu size={32} />
				<span>Menu</span>
			</div>
			<div class="icon-item">
				<Bell size={32} />
				<span>Bell</span>
			</div>
			<div class="icon-item">
				<Home size={32} />
				<span>Home</span>
			</div>
			<div class="icon-item">
				<User size={32} />
				<span>User</span>
			</div>
			<div class="icon-item">
				<Mail size={32} />
				<span>Mail</span>
			</div>
			<div class="icon-item">
				<Phone size={32} />
				<span>Phone</span>
			</div>
			<div class="icon-item">
				<MapPin size={32} />
				<span>Location</span>
			</div>
			<div class="icon-item">
				<Camera size={32} />
				<span>Camera</span>
			</div>
			<div class="icon-item">
				<Music size={32} />
				<span>Music</span>
			</div>
			<div class="icon-item">
				<LogOut size={32} />
				<span>Logout</span>
			</div>
			<div class="icon-item">
				<AlertCircle size={32} />
				<span>Alert</span>
			</div>
			<div class="icon-item">
				<Info size={32} />
				<span>Info</span>
			</div>
			<div class="icon-item">
				<Clock size={32} />
				<span>Clock</span>
			</div>
		</div>
	</section>

	<!-- Emoji Section -->
	<section class="demo-section">
		<h2>😀 Emoji Collection</h2>
		<div class="emoji-grid">
			<div class="emoji-item">😀</div>
			<div class="emoji-item">😎</div>
			<div class="emoji-item">🔥</div>
			<div class="emoji-item">⚡</div>
			<div class="emoji-item">🎉</div>
			<div class="emoji-item">💎</div>
			<div class="emoji-item">🚀</div>
			<div class="emoji-item">🌟</div>
			<div class="emoji-item">💯</div>
			<div class="emoji-item">🎨</div>
			<div class="emoji-item">🎵</div>
			<div class="emoji-item">📱</div>
			<div class="emoji-item">💻</div>
			<div class="emoji-item">🎮</div>
			<div class="emoji-item">🏆</div>
			<div class="emoji-item">🌈</div>
		</div>
	</section>

	<!-- Button Styles Section -->
	<section class="demo-section">
		<h2>🎯 Button Styles</h2>
		<div class="button-showcase">
			<button class="demo-btn primary">
				<Check size={20} />
				Primary
			</button>
			<button class="demo-btn success">
				<Download size={20} />
				Success
			</button>
			<button class="demo-btn danger">
				<Trash2 size={20} />
				Danger
			</button>
			<button class="demo-btn warning">
				<AlertCircle size={20} />
				Warning
			</button>
			<button class="demo-btn secondary">
				<Info size={20} />
				Secondary
			</button>
		</div>
	</section>

	<!-- Interactive Cards -->
	<section class="demo-section">
		<h2>📦 Interactive Cards</h2>
		<div class="card-grid">
			<div class="interactive-card gradient-purple">
				<Camera size={48} />
				<h3>Camera</h3>
				<p>Take photos and videos</p>
				<button class="card-btn">
					Open <ChevronRight size={18} />
				</button>
			</div>
			<div class="interactive-card gradient-cyan">
				<Music size={48} />
				<h3>Music</h3>
				<p>Listen to your library</p>
				<button class="card-btn">
					Open <ChevronRight size={18} />
				</button>
			</div>
			<div class="interactive-card gradient-orange">
				<MapPin size={48} />
				<h3>Location</h3>
				<p>Find places nearby</p>
				<button class="card-btn">
					Open <ChevronRight size={18} />
				</button>
			</div>
		</div>
	</section>
</div>

<!-- Modals -->
<Modal bind:open={modalOpen} title="Information">
	<div class="modal-content-demo">
		<div class="icon-header">
			<Info size={48} color="#667eea" />
		</div>
		<h3>Welcome to the Demo!</h3>
		<p>
			This is a custom modal component built with Svelte 5 and styled with CSS variables. It
			features:
		</p>
		<ul>
			<li><Check size={16} /> Smooth animations</li>
			<li><Check size={16} /> Backdrop blur effect</li>
			<li><Check size={16} /> Click outside to close</li>
			<li><Check size={16} /> Fully customizable</li>
		</ul>
		<button class="demo-btn primary" onclick={() => (modalOpen = false)}>Got it!</button>
	</div>
</Modal>

<Modal bind:open={confirmModalOpen} title="Confirm Action">
	<div class="modal-content-demo">
		<div class="icon-header">
			<AlertCircle size={48} color="#ff4444" />
		</div>
		<h3>Are you sure?</h3>
		<p>This action cannot be undone. Please confirm you want to proceed.</p>
		<div class="button-group">
			<button class="demo-btn secondary" onclick={() => (confirmModalOpen = false)}>
				<X size={20} />
				Cancel
			</button>
			<button class="demo-btn danger" onclick={() => (confirmModalOpen = false)}>
				<Check size={20} />
				Confirm
			</button>
		</div>
	</div>
</Modal>

<style>
	.demo-container {
		min-height: 100%;
		padding: 20px;
		background: var(--bg-primary);
	}

	.demo-header {
		text-align: center;
		margin-bottom: 40px;
	}

	.demo-header h1 {
		margin: 0 0 10px 0;
		font-size: 32px;
		background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.demo-header p {
		margin: 0;
		color: var(--text-subdued);
	}

	.demo-section {
		background: var(--bg-secondary);
		border-radius: var(--border-radius);
		padding: 24px;
		margin-bottom: 24px;
	}

	.demo-section h2 {
		margin: 0 0 20px 0;
		font-size: 24px;
		color: var(--text-primary);
	}

	.button-group {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}

	.demo-btn {
		padding: 12px 24px;
		border-radius: var(--border-radius);
		font-size: 16px;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 8px;
		transition: var(--ui-transition);
	}

	.demo-btn.primary {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.demo-btn.success {
		background: var(--success-color);
		color: white;
	}

	.demo-btn.success:hover {
		background: var(--success-hover);
	}

	.demo-btn.danger {
		background: var(--error-color);
		color: white;
	}

	.demo-btn.danger:hover {
		background: var(--error-hover);
	}

	.demo-btn.warning {
		background: var(--accent-subdued);
		color: white;
	}

	.demo-btn.warning:hover {
		background: var(--accent-active);
	}

	.demo-btn.secondary {
		background: var(--bg-quaternary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
	}

	.demo-btn.secondary:hover {
		background: var(--bg-tertiary);
	}

	.input-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 20px;
	}

	.input-grid .label {
		display: block;
		margin-bottom: 8px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.selected-value {
		margin-top: 8px;
		font-size: 14px;
		color: var(--accent-active);
	}

	.icon-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
		gap: 16px;
	}

	.icon-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 16px;
		background: var(--bg-tertiary);
		border-radius: var(--border-radius);
		color: var(--accent-active);
		transition: var(--ui-transition);
	}

	.icon-item:hover {
		background: var(--bg-quaternary);
		transform: translateY(-2px);
	}

	.icon-item span {
		font-size: 12px;
		color: var(--text-subdued);
	}

	.emoji-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
		gap: 12px;
	}

	.emoji-item {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32px;
		background: var(--bg-tertiary);
		border-radius: var(--border-radius);
		transition: var(--ui-transition);
	}

	.emoji-item:hover {
		background: var(--bg-quaternary);
		transform: scale(1.1);
	}

	.button-showcase {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}

	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 20px;
	}

	.interactive-card {
		padding: 32px;
		border-radius: 16px;
		color: white;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 12px;
		transition: transform 0.2s ease;
	}

	.interactive-card:hover {
		transform: translateY(-4px);
	}

	.gradient-purple {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.gradient-cyan {
		background: linear-gradient(135deg, #06beb6 0%, #48b1bf 100%);
	}

	.gradient-orange {
		background: linear-gradient(135deg, #f77062 0%, #fe5196 100%);
	}

	.interactive-card h3 {
		margin: 0;
		font-size: 20px;
	}

	.interactive-card p {
		margin: 0;
		opacity: 0.9;
	}

	.card-btn {
		margin-top: 8px;
		padding: 8px 16px;
		background: rgba(255, 255, 255, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		color: white;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 4px;
		backdrop-filter: blur(10px);
	}

	.modal-content-demo {
		text-align: center;
	}

	.icon-header {
		margin-bottom: 16px;
	}

	.modal-content-demo h3 {
		margin: 0 0 12px 0;
		color: var(--text-primary);
	}

	.modal-content-demo p {
		margin: 0 0 16px 0;
		color: var(--text-subdued);
		line-height: 1.6;
	}

	.modal-content-demo ul {
		list-style: none;
		padding: 0;
		margin: 0 0 24px 0;
		text-align: left;
	}

	.modal-content-demo li {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px;
		color: var(--text-primary);
	}
</style>
