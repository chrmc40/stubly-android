<div class="app-container">
	<header class="header">
		<h1>Dark Vibes App</h1>
		<div class="status-icons">
			<span class="icon">🔋</span>
			<span class="icon">📶</span>
			<span class="icon">🔔</span>
		</div>
	</header>

	<section class="hero">
		<h2>Scroll to test overlays</h2>
		<p>Watch how content flows behind Android system bars</p>
	</section>

	<section class="card purple">
		<h3>Purple Section</h3>
		<p>This is a vibrant purple card with some dummy content to make it taller and more scrollable.</p>
		<button>Action Button</button>
	</section>

	<section class="card cyan">
		<h3>Cyan Dreams</h3>
		<p>Bright cyan section with contrasting dark text. Perfect for testing visibility.</p>
		<div class="stats">
			<div class="stat">
				<div class="number">1.2K</div>
				<div class="label">Followers</div>
			</div>
			<div class="stat">
				<div class="number">847</div>
				<div class="label">Following</div>
			</div>
			<div class="stat">
				<div class="number">93</div>
				<div class="label">Posts</div>
			</div>
		</div>
	</section>

	<section class="card orange">
		<h3>Orange Energy</h3>
		<p>Hot orange section bringing the heat. Keep scrolling to see more colors!</p>
		<div class="progress-bar">
			<div class="progress" style="width: 65%"></div>
		</div>
	</section>

	<section class="card green">
		<h3>Green Zone</h3>
		<p>Calming green area for your eyes. Notice how the nav buttons look against different backgrounds.</p>
		<ul>
			<li>Item One</li>
			<li>Item Two</li>
			<li>Item Three</li>
			<li>Item Four</li>
		</ul>
	</section>

	<section class="card pink">
		<h3>Pink Paradise</h3>
		<p>Soft pink vibes. Perfect for testing how system UI elements blend with content.</p>
		<button>Another Button</button>
	</section>

	<section class="card blue">
		<h3>Deep Blue</h3>
		<p>Dark blue ocean of content. Almost at the bottom now!</p>
		<div class="chip-container">
			<span class="chip">Design</span>
			<span class="chip">Mobile</span>
			<span class="chip">Android</span>
			<span class="chip">UI/UX</span>
		</div>
	</section>

	<footer class="footer">
		<p>Bottom of the page - test nav bar overlay here</p>
		<button class="footer-btn">Tap Me</button>
	</footer>
</div>

<style>
	.app-container {
		min-height: 100vh;
		padding-bottom: 80px;
	}

	.header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: calc(var(--status-bar-height) + 20px) 20px 30px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header h1 {
		margin: 0;
		font-size: 24px;
	}

	.status-icons {
		display: flex;
		gap: 10px;
	}

	.icon {
		font-size: 20px;
	}

	.hero {
		background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%);
		padding: 60px 20px;
		text-align: center;
	}

	.hero h2 {
		margin: 0 0 10px 0;
		font-size: 32px;
		background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.hero p {
		margin: 0;
		color: #888;
	}

	.card {
		margin: 20px;
		padding: 30px;
		border-radius: 20px;
		min-height: 200px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}

	.card h3 {
		margin: 0 0 15px 0;
		font-size: 24px;
	}

	.card p {
		margin: 0 0 20px 0;
		line-height: 1.6;
		opacity: 0.9;
	}

	.card.purple {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.card.cyan {
		background: linear-gradient(135deg, #06beb6 0%, #48b1bf 100%);
		color: #0a0a0a;
	}

	.card.cyan h3,
	.card.cyan p {
		color: #0a0a0a;
	}

	.card.orange {
		background: linear-gradient(135deg, #f77062 0%, #fe5196 100%);
	}

	.card.green {
		background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
		color: #0a0a0a;
	}

	.card.green h3,
	.card.green p,
	.card.green ul {
		color: #0a0a0a;
	}

	.card.pink {
		background: linear-gradient(135deg, #fc466b 0%, #3f5efb 100%);
	}

	.card.blue {
		background: linear-gradient(135deg, #4e54c8 0%, #8f94fb 100%);
	}

	button,
	.footer-btn {
		background: rgba(255, 255, 255, 0.2);
		border: 2px solid rgba(255, 255, 255, 0.3);
		padding: 12px 24px;
		border-radius: 10px;
		color: white;
		font-size: 16px;
		font-weight: 600;
		cursor: pointer;
		backdrop-filter: blur(10px);
	}

	.card.cyan button,
	.card.green button {
		background: rgba(0, 0, 0, 0.2);
		border-color: rgba(0, 0, 0, 0.3);
		color: #0a0a0a;
	}

	.stats {
		display: flex;
		justify-content: space-around;
		margin-top: 20px;
	}

	.stat {
		text-align: center;
	}

	.number {
		font-size: 28px;
		font-weight: bold;
		color: #0a0a0a;
	}

	.label {
		font-size: 14px;
		opacity: 0.7;
		color: #0a0a0a;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		overflow: hidden;
		margin-top: 20px;
	}

	.progress {
		height: 100%;
		background: white;
		transition: width 0.3s ease;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 20px 0 0 0;
	}

	li {
		padding: 12px;
		background: rgba(0, 0, 0, 0.1);
		margin-bottom: 8px;
		border-radius: 8px;
	}

	.chip-container {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 20px;
	}

	.chip {
		padding: 8px 16px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 20px;
		font-size: 14px;
		backdrop-filter: blur(10px);
	}

	.footer {
		background: linear-gradient(135deg, #232526 0%, #414345 100%);
		padding: 40px 20px calc(var(--nav-bar-height) + 40px);
		text-align: center;
	}

	.footer p {
		margin: 0 0 20px 0;
		color: #888;
	}
</style>
