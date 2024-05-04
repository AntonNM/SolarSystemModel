<script>
// @ts-nocheck
	import { onMount } from 'svelte';
	
	let canvasContainer;
	let canvas;
	let speed = 0;
	let planets = [];
	let solarSystem;
	let targetPlanet = "Sun";
	let period = 3600*24; // day in seconds
	let state = 1;
	
	onMount(async () => {
		solarSystem = await import ("./solarSystem.js");
		solarSystem.createScene(canvas, canvasContainer)
		speed = solarSystem.getSpeed() / period;
		planets = solarSystem.getPlanets();
		targetPlanet = solarSystem.getTarget()
	});

	function updatePeriod(){
		if(!solarSystem) return;
		speed = Math.round(solarSystem.getSpeed() / period);
	}
	function updateSpeed(){
		if(!solarSystem) return;
		solarSystem.setSpeed(speed*period);
	}
	function updateTarget(){
		if(!solarSystem) return;
		solarSystem.setTarget(targetPlanet);
	}
	function resetFirst(){
		if(!solarSystem) return;
		solarSystem.resetFirst();
	}
	function toggleCameraLock(){
		if(!solarSystem) return;
		solarSystem.toggleCameraLock();
	}
	function toggleState(){
		if(!solarSystem) return;
		solarSystem.toggleState();
		state = !state;
	}

	let periods = [
		{key:"Years", value:3600*24*365},
		{key:"Lunar Months", value:3600*24*28},
		{key:"Weeks", value:3600*24*7},
		{key:"Days", value:3600*24},
		{key:"Hours", value:3600},
		{key:"Minutes", value:60},
		{key:"Seconds", value:1},
	]
</script>
  <body id="page">

	<div id="header">
		<h1>Solar System </h1>
		<h5>@{solarSystem?.simulationTime}</h5>
		<div class="header-control-div">
			
			<div class="speed-div ctrl-div">
				<button on:click={toggleState}> {state?"Pause":"Play"}</button>
				<label for="speed">Speed:</label>
				<input type="range" id="speed" name="speed" step="0.1" min="0" max="1000" bind:value={speed} on:input={updateSpeed}/>
				<!-- <label for="speed">Periods/Second</label> -->
				<h3>
					{speed}
				</h3>
				<select id="period" name = "period" bind:value={period} on:change={updatePeriod}>
					{#each periods as period}
						<option value={period.value}>
							{period.key}
						</option>
					{/each}
				</select>
				<label for="period">/Second</label>
			</div>
			<div class="target-div ctrl-div">
				<label for="target">Target</label>
				<select name="target" bind:value={targetPlanet} on:change={updateTarget}>
					{#each planets as planet}
						<option value={planet.id}>
							{planet.id!="Sun"?planet.id:"none"}
						</option>
					{/each}
				</select>
				<button on:click={toggleCameraLock}> lock</button>
			</div>
		</div>

	</div>
	<div id="scene" bind:this={canvasContainer}>
		<canvas bind:this={canvas} style="width:100%"></canvas>
	</div>
</body>

<style>

	#page{
		height:100vh;
		width:100%;
		display:grid;
		grid-template-rows: auto 1fr;
	}

	#header{
		grid-row: 1;
	}

	#scene{
		grid-row: 2;
		width:100vw;
	}

	.ctrl-div{
		display:flex;
		flex-direction: row;
		align-items: center;
		gap: 8px;
	}

	#period{
		height:min-content;
	}

	.header-control-div{
		display: grid;
		grid-template-columns: auto auto 1fr;
		column-gap: 16px;

	}

</style>
