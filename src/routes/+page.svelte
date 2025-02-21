<script>
// @ts-nocheck
	import { onMount } from 'svelte';
	import {format} from 'date-fns';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

	let canvasContainer;
	let canvas;
	let speedInput = 1
	let period = 1
	 
	onMount(async () => {
		createScene(canvas, canvasContainer)
		window.addEventListener("resize", onWindowResize);

	function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( window.innerWidth, window.innerHeight );
		}

	});

	let periods = [
		{key:"Years", value:3600*24*365},
		{key:"Lunar Months", value:3600*24*28},
		{key:"Weeks", value:3600*24*7},
		{key:"Days", value:3600*24},
		{key:"Hours", value:3600},
		{key:"Minutes", value:60},
		{key:"Seconds", value:1},
	]

	export let simulationTime = (new Date()).getTime();
	
	export let state = {
		'paused':0,
		'playing':1,
		'stopped':2,
	}
	
	let simulationState = state.playing;
	
	export function setState(newState){
		simulationState = newState
	}

	export function toggleState(){
		if(simulationState == 2){
			simulationState = state.paused;
			animate();
		}
		simulationState = !simulationState
	}

	export function stopRestart(){
		if(simulationState == state.stopped ){
			restart()
			toggleState()
		}
		else{
			simulationState = state.stopped;
		}

	}

	export function restart(){
		simulationTime = (new Date()).getTime()
		speedInput = 1;
		period = 1;
		controlTarget = "Sun"
	}
	
	$:speed = speedInput * period;
	
	export function setSpeed(newSpeed){
		speed = newSpeed;
	}

	export function getSpeed(){
		return speed;
	}
	
	export let controlTarget = 'Sun';
	let _previousTarget = controlTarget;
	
	export function setTarget(target){
		controlTarget = target;
	}
	export function getTarget(){
		return controlTarget;
	}
	
	let scene;
	let renderer;
	let camera
	let controls;
	
	const minDistance = 0.1;
	const maxDistance = 4000;

	export const createScene = async (canvas, canvasContainer) => {
		scene = new THREE.Scene();

		let backgroundTexture = new THREE.TextureLoader().loadAsync('8k_stars_milky_way.jpg');
		loadImages();
		const geometry = new THREE.SphereGeometry(maxDistance);
		const material = new THREE.MeshBasicMaterial( {
			map: await backgroundTexture,
			side: THREE.DoubleSide,

		} );
		scene.add(new THREE.Mesh( geometry, material ));
	
		const [width, height] = [window.innerWidth,  window.innerHeight]		
		renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
		renderer.setPixelRatio(devicePixelRatio);
		renderer.setSize( width, height , false);
	
		camera = new THREE.PerspectiveCamera( 100, width / height, minDistance, 2*maxDistance );
		cameraReset("Sun");
	
		controls = new OrbitControls( camera, renderer.domElement );
		controls.maxDistance = maxDistance*0.9;
		controls.update();
		
		await buildPlanets();
	
		animate();
	  }

	function cameraReset(target="Sun"){
		camera.position.set( 0, 20, (getPlanetByID(target)?.scaledRadius ?? 50) * 6 );
		camera.lookAt( 0, 0, 0 );
	}
	
	// const G = 6.674* Math.pow(10, -11);
	//https://ssd.jpl.nasa.gov/planets/approx_pos.html#tables
	//              a              e               I                L            long.peri.      long.node.
	//              au, au/Cy     rad, rad/Cy     deg, deg/Cy      deg, deg/Cy      deg, deg/Cy     deg, deg/Cy
	// ------------------------------------------------------------------------------------------------------
	// Mercury     0.38709843      0.20563661      7.00559432      252.25166724     77.45771895     48.33961819
	//             0.00000000      0.00002123     -0.00590158   149472.67486623      0.15940013     -0.12214182
	// Venus       0.72332102      0.00676399      3.39777545      181.97970850    131.76755713     76.67261496
	//             -0.00000026     -0.00005107      0.00043494    58517.81560260      0.05679648     -0.27274174
	// EM Bary     1.00000018      0.01673163     -0.00054346      100.46691572    102.93005885     -5.11260389
	//             -0.00000003     -0.00003661     -0.01337178    35999.37306329      0.31795260     -0.24123856
	// Mars        1.52371243      0.09336511      1.85181869       -4.56813164    -23.91744784     49.71320984
	//             0.00000097      0.00009149     -0.00724757    19140.29934243      0.45223625     -0.26852431
	// Jupiter     5.20248019      0.04853590      1.29861416       34.33479152     14.27495244    100.29282654
	//             -0.00002864      0.00018026     -0.00322699     3034.90371757      0.18199196      0.13024619
	// Saturn      9.54149883      0.05550825      2.49424102       50.07571329     92.86136063    113.63998702
	//             -0.00003065     -0.00032044      0.00451969     1222.11494724      0.54179478     -0.25015002
	// Uranus      19.18797948      0.04685740      0.77298127      314.20276625    172.43404441     73.96250215
	//             -0.00020455     -0.00001550     -0.00180155      428.49512595      0.09266985      0.05739699
	// Neptune     30.06952752      0.00895439      1.77005520      304.22289287     46.68158724    131.78635853
	//             0.00006447      0.00000818      0.00022400      218.46515314      0.01009938     -0.00606302
	// ------------------------------------------------------------------------------------------------------
	// EM Bary = Earth/Moon Barycenter
	
	//              b             c             s            f 
	// ---------------------------------------------------------------
	// Jupiter   -0.00012452    0.06064060   -0.35635438   38.35125000
	// Saturn     0.00025899   -0.13434469    0.87320147   38.35125000
	// Uranus     0.00058331   -0.97731848    0.17689245    7.67025000
	// Neptune   -0.00041348    0.68346318   -0.10162547    7.67025000
	// ---------------------------------------------------------------
	
	//Mass (10^24 kg)
	let planets = {
		"Sun":{id:"Sun",      imagePath:'2k_sun.jpg',                 a0:0.38709843, a:0.0, e0:0.20563661, e:0.00002123, i0:7.0559432, i:-0.00590158, l0:252.25166724, l:149470.67486623, w0:77.45771895, w:0.15940013, o0:48.33961819, o:-0.12214182, orbitalEccentricity:0,     mass:19890, orbitalPlaneAngle:0,    rotationalAxisAngle:7.25,   color:'yellow',     radius:696340,   dayInHours:588,       orbitDistance:0,        orbitTime:0 }, //
		"Mercury":{id:"Mercury",  imagePath:'2k_mercury.jpg',             a0:0.38709843, a:0.00000000, e0:0.20563661, e:0.00002123, i0:7.0559432, i:-0.00590158, l0:252.25166724, l:149472.67486623, w0:77.45771895, w:0.15940013, o0:48.33961819, o:-0.12214182,     orbitalEccentricity:0.206, mass:0.330, orbitalPlaneAngle:7,    rotationalAxisAngle:0.1,    color:'gray',       radius:2439.7,  dayInHours:1407.6,    orbitDistance:36.8,     orbitTime:88*24*3600 },
		"Venus":{id:"Venus",    imagePath:'2k_venus_atmosphere.jpg',    a0:0.72332102, a:-0.00000026, e0:0.00676399, e:-0.00005107, i0:3.39777545, i:0.00043494, l0:181.97909950, l:58517.81560260, w0:131.76755713, w:0.05679648, o0:76.67261496, o:-0.27274174,   orbitalEccentricity:0.007, mass:4.97,  orbitalPlaneAngle:3.39, rotationalAxisAngle:177,    color:'yellow',     radius:6051.8,  dayInHours:5832.5,    orbitDistance:67.2,     orbitTime:224.7*24*3600 },
		"Earth":{id:"Earth",    imagePath:'2k_earth_daymap.jpg',        a0:1.00000018, a:-0.00000003, e0:0.01673163, e:-0.00003661, i0:-0.00054346, i:-0.01337178, l0:100.46691572, l:35999.37306329, w0:102.93005885, w:0.31795260, o0:-5.11260389,  o:-0.24123856, orbitalEccentricity:0.055, mass:5.97,  orbitalPlaneAngle:0,    rotationalAxisAngle:23,     color:'blue',       radius:6371,    dayInHours:23.9,      orbitDistance:93,       orbitTime:365.2*24*3600},
		"Mars":{id:"Mars",     imagePath:'2k_mars.jpg',                a0:1.52371243,  a:0.00000097,  e0:0.09336511, e:0.00009149,  i0:1.85181869, i:-0.00724757, l0:-4.56813164,  l:19140.29934243, w0:-23.91744784, w:0.45223625, o0:49.71320984,  o:-0.26852431,  orbitalEccentricity:0.094, mass:0.642, orbitalPlaneAngle:1.85, rotationalAxisAngle:25,     color:'red',        radius:3389.5,  dayInHours:24.6,      orbitDistance:141.6,    orbitTime:687*24*3600},
		"Jupiter":{id:"Jupiter",  imagePath:'2k_jupiter.jpg',             b:-0.00012452, c:0.06064060,  s:-0.35635438, f:38.35125000, a0:5.20248019,  a:-0.00002864, e0:0.04853590, e:0.00018026,  i0:1.29861416, i:-0.00322699, l0:34.33479152,  l:3034.90371757,  w0:14.27495244,  w:0.18199196, o0:100.29282654, o:0.13024619,  orbitalEccentricity:0.049, mass:1898,  orbitalPlaneAngle:1.31, rotationalAxisAngle:3,      color:'orange',     radius:69911,   dayInHours:9.9,       orbitDistance:483.6,    orbitTime:4331*24*3600},
		"Saturn":{id:"Saturn",   imagePath:'2k_saturn.jpg', ringImagePath:'2k_saturn_ring_alpha.png',              b:0.00025899,  c:-0.13434469, s:0.87320147,  f:38.35125000, a0:9.54149883,  a:-0.00003065, e0:0.05550825, e:-0.00032044, i0:2.49424102, i:0.00451969,  l0:50.07571329,  l:1222.11494724,  w0:92.86136063,  w:0.54179478, o0:113.63998702, o:-0.25015002,  orbitalEccentricity:0.052, mass:568,   orbitalPlaneAngle:2.49, rotationalAxisAngle:27,     color:'brown',      radius:58232, ringRadius:282000,   dayInHours:10.7,      orbitDistance:886.5,    orbitTime:10747*24*3600},
		"Uranus":{id:"Uranus",   imagePath:'2k_uranus.jpg',              b:0.00058331,  c:-0.97731848, s:0.17689245,  f:7.67025000, a0:19.18797948, a:-0.00020455, e0:0.04685740, e:-0.00001550, i0:0.77298127, i:-0.00180155, l0:314.20276625, l:428.49512595,   w0:172.43404441, w:0.09266985, o0:73.96250215,  o:0.05739699,  orbitalEccentricity:0.047, mass:86.8,  orbitalPlaneAngle:0.77, rotationalAxisAngle:98,     color:'lightblue',  radius:25362,   dayInHours:17.2,      orbitDistance:1783.7,   orbitTime:30589*24*3600},
		"Neptune":{id:"Neptune",  imagePath:'2k_neptune.jpg',             b:-0.00041348, c:0.68346318,  s:-0.10162547, f:7.67025000, a0:30.06952752, a:0.00006447,  e0:0.00895439, e:0.00000818,  i0:1.77005520, i:0.00022400,  l0:304.22289287, l:218.46515314,   w0:46.68158724,  w:0.01009938, o0:131.78635853, o:-0.00606302,  orbitalEccentricity:0.010, mass:102,   orbitalPlaneAngle:1.77, rotationalAxisAngle:30,     color:'darkblue',   radius:24622,   dayInHours:16.1,      orbitDistance:2795.2,   orbitTime:59800*24*3600},
	}

	let planetList = Object.values(planets);
	function getPlanetByID(ID){
		return planets[ID]
	}
	
	function loadImages(){
		planetList.forEach((planet)=>{
			planet.image = new THREE.TextureLoader().loadAsync(planet.imagePath)
			if(planet.id == "Saturn")
				planet.ringImage = new THREE.TextureLoader().loadAsync(planet.ringImagePath)
		})
	}

	//used to rotate objects to match starting orientation of images and camera, (mostly 2D shapes being maped to 3D)
	var globalOrientationQuaternion = new THREE.Quaternion();
	globalOrientationQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2); // Axis of rotation is x axis
	async function buildPlanets(){
		
		planetList.forEach(async planet =>  {
	
			planet.mesh = await getPlanetMesh(planet);
			planet.rotationSpeed = getPlanetRotationSpeed(planet);
			planet.line = getPlanetOrbitPath(planet)

			if(planet.id=="Saturn"){
				planet.ring = getSaturnRing(planet);
				scene.add(planet.ring);
			}
			rotatePlanetsAxis(planet);

		   
			scene.add(planet.mesh)
			scene.add(planet.line);
		});   
	}
	
	async function getSaturnRing (planet){
		const outerRadius = Math.pow(planet.ringRadius, 1/root)*radiusScalingFactor;
		const geometry = new THREE.RingGeometry(planet.scaledRadius, outerRadius);
		var pos = geometry.attributes.position;
		var v3 = new THREE.Vector3();
		for (let i = 0; i < pos.count; i++){
			v3.fromBufferAttribute(pos, i);
			geometry.attributes.uv.setXY(i, v3.length() < ((outerRadius+planet.scaledRadius)/2) ? 0 : 1, 1);
		}
		const material = new THREE.MeshBasicMaterial( {
			map: await planet.ringImage,
			transparent:true,
			side: THREE.DoubleSide,
		}); 
		const ring = new THREE.Mesh( geometry, material ); 
		return ring.applyQuaternion(globalOrientationQuaternion);
	}

	// set to allow visibility of Mercury's surface on zoom
	// might be ways to adjust camera or renders settings and change this scaling factor
	//handles mile to km conversion
	const mileToKilometer = 1.60934 
	const root = 2;
	export let radiusScalingFactor = (maxDistance/50)/(mileToKilometer*Math.pow(getPlanetByID('Sun').radius, 1/root)); 
	async function getPlanetMesh(planet){
		const radius = radiusScalingFactor * Math.pow(planet.radius, 1/root)
		planet.scaledRadius = radius;
		const geometry = new THREE.SphereGeometry(radius);
		const material = new THREE.MeshBasicMaterial( {
			map: await planet.image
		} );
	
		return new THREE.Mesh( geometry, material );
	}
	
	function rotatePlanetsAxis(planet){
		let rotationalAxisQuart = new THREE.Quaternion();
		rotationalAxisQuart.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 2*Math.PI *(planet.rotationalAxisAngle/360)); 
		planet.mesh.applyQuaternion(rotationalAxisQuart)
		if(planet.id == 'Saturn') planet.ring.applyQuaternion(rotationalAxisQuart)
	}
	
	function getPlanetRotationSpeed(planet){
		return (planet.spin?-1:1)*2*Math.PI / (planet.dayInHours * 3600000) ;
	}
	
	function getPlanetOrbitPath(planet){
		const points = getSpacedPoints(planet)
		return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({
			color: planet?.color ?? 'yellow'
		}));
	}
	
	function getSpacedPoints(planet, n=360){
		const orbitTime = (planet.orbitTime * 1000)
		const timeInterval = orbitTime / n;
		const startTime = (new Date()).getTime();
		let time = startTime;
		let points = [];
		// const cutoff = time / orbitTime;
		for(let i = 0; i <= 2*n; i++){
		// while((cutoff + 1) > (time / orbitTime) ){
			points.push(calcPosition(planet, time));
			time += timeInterval;
		}
		points.push(points[0])
		return points;
	}
	
	//calcPosition designed from equations provided at
	//https://ssd.jpl.nasa.gov/planets/approx_pos.html

	//takes a planet object conatining necessary coefficients and a unix timestamp in milliseconds and calculates approximate position of the planet
	function calcPosition(planet, T){ 
		const time = ((T / 86400000) + 2440587.5 - 2451545.0)/36525 
		calcElements(planet, time)
		computePerihelionAndMeanAnomaly(planet, time)
		solveKeplerEquation(planet)
		computeHelioCoordinates(planet)
		const position = adjustOrbitalPlane(planet)
		const scaledPosition = scaleOrbit(planet, position)
		return scaledPosition

	}
	
	function calcElements(planet, T = (new Date()).getTime()){
	
		planet.A = planet.a0 + planet.a * T;
		planet.E = planet.e0 + planet.e * T;
		planet.I = planet.i0 + planet.i * T;
		planet.L = planet.l0 + planet.l * T;
		planet.W = planet.w0 + planet.w * T;
		planet.O = planet.o0 + planet.o * T;
	
	}
	
	function computePerihelionAndMeanAnomaly(planet, T){
		const wBar = planet.W;
		const L = planet.L;
		const o = planet.O;
		planet.perihelion = wBar - o;
		planet.meanAnomaly =  L - wBar 
		if(planet?.b){
			const fT = planet.f*T
			planet.meanAnomaly += planet.b*T*T + planet.c*Math.cos(fT) + planet.s*Math.sin(fT)
		}
	}
	
	const degreesToRad = (Math.PI / 180);
	function cos(x){
		return Math.cos(x * degreesToRad)
	}
	function sin(x){
		return Math.sin(x * degreesToRad)
	}
	
	const tolerance = 0.000001;
	function solveKeplerEquation(planet){
		const E = planet.E // orbit average ecentricity
		const eStar = 57.29578 * E 
		const M = (planet.meanAnomaly % 360) - 180;
		const E0 = M + eStar*sin(M); //inital eccentric anamoly
		
		let iterate = (En)=>{
			const deltaM = (M - (En - eStar*sin(En)));
			const deltaE = (deltaM/(1 - E*cos(En)))
			const retval = [En + deltaE, deltaE]
			return retval;
		}
		
		let [En, deltaE] = iterate(E0);
		while(Math.abs(deltaE) > tolerance){
			[En, deltaE] = iterate(En)
		}
		planet.eccentricAnomaly = En;
	}
	
	function computeHelioCoordinates(planet){
		planet.xPrime = planet.A * (cos(planet.eccentricAnomaly) - planet.E)
		planet.yPrime = planet.A * Math.sqrt(1-Math.pow(planet.E, 2)) * sin(planet.eccentricAnomaly)
		planet.zPrime = 0;
	}
	
	function adjustOrbitalPlane(planet){
		const w = planet.perihelion;
		const cosW = cos(w);
		const sinW = sin(w);
	
		const O = planet.o;
		const cosO = cos(O);
		const sinO = sin(O);
	
		const I = planet.i;
		const cosI = cos(I);
		const sinI = sin(I);
	
		const x =   (cosW*cosO-sinW*sinO*cosI)*planet.xPrime + 
					(-sinW*cosO-cosW*sinO*cosI)*planet.yPrime;
	
		const y =   (cosW*sinO+sinW*cosO*cosI)*planet.xPrime + 
					(-sinW*sinO+cosW*cosO*cosI)*planet.yPrime;
	
		const z =   (sinW*sinI)*planet.xPrime + 
					(cosW*sinI)*planet.yPrime;
	
		return (new THREE.Vector3(x,y,z)).applyQuaternion(globalOrientationQuaternion);
	}
	
	//////////////
	
	const minOrbit = 0.3074948213625648 * (0.9*getPlanetByID('Mercury').orbitDistance)
	const maxOrbit = 30.338928225304635 * (1.1*getPlanetByID('Neptune').orbitDistance)
	
	function scaleOrbit(planet, v){
	
		if(!(v.length() && planet.orbitDistance)) return v;
		v.multiplyScalar(planet.orbitDistance);
	
		const minOrbitDistance = 1.1*(getPlanetByID('Sun').scaledRadius + getPlanetByID('Mercury').scaledRadius + 2*minDistance);
		const maxOrbitDistance = maxDistance/2;
	
		const scaledLength = minOrbitDistance + maxOrbitDistance*Math.pow((v.length() - minOrbit)/maxOrbit, 1/3);
	
		return v.multiplyScalar(scaledLength / v.length());
	}
	//////////////////////
	
	let clock = new THREE.Clock();
	const center = new THREE.Vector3(0,0,0);
	const lockedCameraDirection = new THREE.Vector3(0, 1, 0)
	function animate() {
		const simulationTimePassed = clock.getDelta() * 1000 * speed;
		
		
		if(simulationState!= state.stopped)requestAnimationFrame( animate );
		controls.target.set(0,0,0);
		controls.update();
		//if(camera.position.length() > maxDistance*0.9) camera.position.multiplyScalar((maxDistance*0.9) / camera.position.length())
		renderer.render( scene, camera );

		if(simulationState == state.playing) {

			simulationTime += simulationTimePassed;
			planetList.forEach(planet => {
				const rotation = planet.rotationSpeed * simulationTimePassed;
				planet.mesh.rotation.y += rotation;
				if(planet.id=="Sun"){
					planet.mesh.position.copy(center)
					return
				}
				const position = calcPosition(planet, simulationTime);
				planet.mesh.position.copy(position)
				if(planet.id=="Saturn"){
					planet.ring.position.copy(position)
					planet.mesh.rotation.y += rotation;
				}
			});
			
			const targetPosition = getPlanetByID(controlTarget).mesh.position;
			let scaledTargetPosition = (new THREE.Vector3()).copy(targetPosition).multiplyScalar(-1);
			planetList.forEach(planet=>{
				planet.mesh.position.add(scaledTargetPosition)
				if(planet.id=="Saturn"){
					planet.ring.position.copy(planet.mesh.position)
				}
			})
			const sunPosition = getPlanetByID('Sun').mesh.position;
			planetList.forEach(planet=>{
				planet.line.position.copy(sunPosition);
			})

			if(controlTarget != _previousTarget ){
				_previousTarget = controlTarget;
				cameraReset(controlTarget);
			}
		}
	}

	function validateSpeedInput(){
		if(speedInput > 1000) speedInput = 1000;
		if(speedInput < 0) speedInput = 0;
	}

	let isHidden = false;
	</script>

  <body id="page">

	<div id="header" class:isHidden>
		<div class="header-control-div" style="border-width:thin;" >
			<div class="time-div ctrl-div">
				<div class="ctrl-div">
					<button on:click={toggleState} style="min-width:30px"><i class={simulationState==state.playing?"fa fa-solid fa-pause":"fa fa-solid fa-play"}></i></button>
					<button on:click={stopRestart} style="min-width:30px"><i class={simulationState!=state.stopped?"fa fa-solid fa-stop":"fa fa-solid fa-refresh"}></i></button>
				</div>
				<h5 style="min-width:200px;margin:0px;">{format(simulationTime, 'yyyy-MM-dd HH-mm-ss')}</h5>
			</div>
			<div class="speed-div ctrl-div">
				<div class="ctrl-div">
					<label for="speed">Speed:</label>
					<input type="range" id="speed" name="speed" step="0.1" min="0" max="1000" bind:value={speedInput}/>
				</div>
				<div class="ctrl-div">
					<input type="number" step="0.1" min="0" max="1000" bind:value={speedInput} on:input={validateSpeedInput} style="max-height:14.8px;">
					<select id="period" name = "period" class="select-ctrl" bind:value={period} >
						{#each periods as period}
							<option value={period.value}>
								{period.key}
							</option>
						{/each}
					</select>
					<label for="period">/Second</label>
				</div>
			</div>
			<div class="target-div ctrl-div">
				<label for="target">Target:</label>
				<select id="target" name="target" class="select-ctrl" bind:value={controlTarget}>
					{#each Object.values(planets) as planet}
						<option value={planet.id}>
							{planet.id}
						</option>
					{/each}
				</select>
			</div>
		</div>
		<div class="hide-ctrl" class:isHidden>
			<h6><a on:click={()=>{isHidden = !isHidden}}>hide controls</a></h6>
		</div>
	</div>
	
	<div class="show-ctrl" class:isHidden = {!isHidden}>
		<h6><a on:click={()=>{isHidden = !isHidden}}>show controls</a></h6>
	</div>
	<div id="scene" bind:this={canvasContainer}>
		<canvas bind:this={canvas} ></canvas>
	</div>
</body>


<style lang="scss">

	h6{
		margin:0;
	}

	.isHidden{
		display:none !important;
	}

	body{
		font-family: 'Orbitron', sans-serif;
	}

	.select-ctrl{
		font-family: 'Orbitron', sans-serif;
	}

	.select-ctrl>option{
		font-family: 'Orbitron', sans-serif;
	}

	#page{
		height:100vh;
		width:100%;
		display:relative;
	}

	#header{
		font-family: 'Orbitron', sans-serif;
		z-index:1;
		position:fixed;
		border-color: white;
		border-width:thin;
		border:solid;
		padding:8px;
		margin:8px;
		display:grid;
		grid-template-rows: auto auto;

	}

	#header.isHidden{
		display:none;
	}

	@media only screen and (max-width: 600px) {
		#header{
			left:0;
			right:0;
			bottom: 0;
		}

		.hide-ctrl{
			display: flex;
			justify-content: right;
		}

		.show-ctrl{
			z-index: 1;
			position: fixed;
			right:12px;
			bottom:12px;
			display: flex;
			justify-content: right;
		}

	}

	@media only screen and (min-width: 600px) {
		#header{
			left:0;
			right:0;
			top:10px;
		}

		.hide-ctrl{
			display: flex;
			justify-content: right;
		}

		.show-ctrl{
			z-index: 1;
			position: fixed;
			right:12px;
			top:12px;
			display: flex;
			justify-content: right;
		}
	}

	#header>h1{
		margin:0;
	}

	#scene{
		position:fixed;
		left:4px;
		top:4px;
		width:calc(100% - 8px);
		max-height:calc(100% - 8px);

	}

	#scene>canvas{
		width:100%;
		max-height: 100%;
	}

	.ctrl-div{
		display:flex;
		flex-wrap: wrap;
		flex-direction: row;
		align-items: center;
		gap: 8px;
		margin: 8px;
	}

	.time-div{
		flex-wrap:wrap-reverse !important;
	}

	#period{
		height:min-content;
	}

	.header-control-div{

		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		width: 100%;
	}

</style>
