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
	}
	
	let simulationState = state.playing;
	
	export function setState(newState){
		simulationState = newState
	}
	export function toggleState(){
		simulationState = !simulationState
	}
	
	$:speed = speedInput * period; //3600*24*3.65
	
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
	
	let cameraLock = false;
	export function toggleCameraLock(){
		// cameraLock = !cameraLock;
	}
	
	let first = true;
	export function resetFirst(){
	    first = true;
	}
	
	let scene;
	let renderer;
	let camera
	let controls;
	
	const minDistance = 0.1;
	const maxDistance = 4000;
	
	export const createScene = (canvas, canvasContainer) => {
	
		scene = new THREE.Scene();
		scene.background = new THREE.TextureLoader().load('8k_stars_milky_way.jpg');
	
		const style = getComputedStyle(canvasContainer)
		const [width, height] = [parseInt(style.width), parseInt(style.height)]
		console.log("dimensions", width, height)
		
		renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
		renderer.setPixelRatio(devicePixelRatio);
		renderer.setSize( width, height , false);
	
		camera = new THREE.PerspectiveCamera( 100, width / height, minDistance, maxDistance );
		cameraReset();
	
		controls = new OrbitControls( camera, renderer.domElement );
		controls.update();
		
		buildPlanets();
	
		animate();
	  }

	function cameraReset(){
		camera.position.set( 0, 20, 100 );
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
	let planets = [
		{id:"Sun",      imagePath:'2k_sun.jpg',                 a:0.38709843, a0:0.0, e:0.20563661, e0:0.00002123, i:7.0559432, i0:-0.00590158, l:252.25166724, l0:149470.67486623, w:77.45771895, w0:0.15940013, o:48.33961819, o0:-0.12214182, orbitalEccentricity:0,     mass:19890, orbitalPlaneAngle:0,    rotationalAxisAngle:7.25,   color:'yellow',     radius:696340,   dayInHours:588,       orbitDistance:0,        orbitTime:0 }, //
		{id:"Mercury",  imagePath:'2k_mercury.jpg',             a:0.38709843, a0:0.00000000, e:0.20563661, e0:0.00002123, i:7.0559432, i0:-0.00590158, l:252.25166724, l0:149472.67486623, w:77.45771895, w0:0.15940013, o:48.33961819, o0:-0.12214182,     orbitalEccentricity:0.206, mass:0.330, orbitalPlaneAngle:7,    rotationalAxisAngle:0.1,    color:'gray',       radius:2439.7,  dayInHours:1407.6,    orbitDistance:36.8,     orbitTime:88*24*3600 },
		{id:"Venus",    imagePath:'2k_venus_atmosphere.jpg',    a:0.72332102, a0:-0.00000026, e:0.00676399, e0:-0.00005107, i:3.39777545, i0:0.00043494, l:181.97909950, l0:58517.81560260, w:131.76755713, w0:0.05679648, o:76.67261496, o0:-0.27274174,   orbitalEccentricity:0.007, mass:4.97,  orbitalPlaneAngle:3.39, rotationalAxisAngle:177,    color:'yellow',     radius:6051.8,  dayInHours:5832.5,    orbitDistance:67.2,     orbitTime:224.7*24*3600 },
		{id:"Earth",    imagePath:'2k_earth_daymap.jpg',        a:1.00000018, a0:-0.00000003, e:0.01673163, e0:-0.00003661, i:-0.00054346, i0:-0.01337178, l:100.46691572, l0:35999.37306329, w:102.93005885, w0:0.31795260, o:-5.11260389,  o0:-0.24123856, orbitalEccentricity:0.055, mass:5.97,  orbitalPlaneAngle:0,    rotationalAxisAngle:23,     color:'blue',       radius:6371,    dayInHours:23.9,      orbitDistance:93,       orbitTime:365.2*24*3600},
		{id:"Mars",     imagePath:'2k_mars.jpg',                a:1.52371243,  a0:0.00000097,  e:0.09336511, e0:0.00009149,  i:1.85181869, i0:-0.00724757, l:-4.56813164,  l0:19140.29934243, w:-23.91744784, w0:0.45223625, o:49.71320984,  o0:-0.26852431,  orbitalEccentricity:0.094, mass:0.642, orbitalPlaneAngle:1.85, rotationalAxisAngle:25,     color:'red',        radius:3389.5,  dayInHours:24.6,      orbitDistance:141.6,    orbitTime:687*24*3600},
		{id:"Jupiter",  imagePath:'2k_jupiter.jpg',             b:-0.00012452, c:0.06064060,  s:-0.35635438, f:38.35125000, a:5.20248019,  a0:-0.00002864, e:0.04853590, e0:0.00018026,  i:1.29861416, i0:-0.00322699, l:34.33479152,  l0:3034.90371757,  w:14.27495244,  w0:0.18199196, o:100.29282654, o0:0.13024619,  orbitalEccentricity:0.049, mass:1898,  orbitalPlaneAngle:1.31, rotationalAxisAngle:3,      color:'orange',     radius:69911,   dayInHours:9.9,       orbitDistance:483.6,    orbitTime:4331*24*3600},
		{id:"Saturn",   imagePath:'2k_saturn.jpg', ringImagePath:'2k_saturn_ring_alpha.png',              b:0.00025899,  c:-0.13434469, s:0.87320147,  f:38.35125000, a:9.54149883,  a0:-0.00003065, e:0.05550825, e0:-0.00032044, i:2.49424102, i0:0.00451969,  l:50.07571329,  l0:1222.11494724,  w:92.86136063,  w0:0.54179478, o:113.63998702, o0:-0.25015002,  orbitalEccentricity:0.052, mass:568,   orbitalPlaneAngle:2.49, rotationalAxisAngle:27,     color:'brown',      radius:58232, ringRadius:282000,   dayInHours:10.7,      orbitDistance:886.5,    orbitTime:10747*24*3600},
		{id:"Uranus",   imagePath:'2k_uranus.jpg',              b:0.00058331,  c:-0.97731848, s:0.17689245,  f:7.67025000, a:19.18797948, a0:-0.00020455, e:0.04685740, e0:-0.00001550, i:0.77298127, i0:-0.00180155, l:314.20276625, l0:428.49512595,   w:172.43404441, w0:0.09266985, o:73.96250215,  o0:0.05739699,  orbitalEccentricity:0.047, mass:86.8,  orbitalPlaneAngle:0.77, rotationalAxisAngle:98,     color:'lightblue',  radius:25362,   dayInHours:17.2,      orbitDistance:1783.7,   orbitTime:30589*24*3600},
		{id:"Neptune",  imagePath:'2k_neptune.jpg',             b:-0.00041348, c:0.68346318,  s:-0.10162547, f:7.67025000, a:30.06952752, a0:0.00006447,  e:0.00895439, e0:0.00000818,  i:1.77005520, i0:0.00022400,  l:304.22289287, l0:218.46515314,   w:46.68158724,  w0:0.01009938, o:131.78635853, o0:-0.00606302,  orbitalEccentricity:0.010, mass:102,   orbitalPlaneAngle:1.77, rotationalAxisAngle:30,     color:'darkblue',   radius:24622,   dayInHours:16.1,      orbitDistance:2795.2,   orbitTime:59800*24*3600},
	]
	function getPlanetByID(ID){
		return planets.filter((p)=>p.id==ID)[0]
	}
	export function getPlanets(){
		return planets;
	}
	
	//used to rotate objects to match starting orientation of images and camera, (mostly 2D shapes being maped to 3D)
	var globalOrientationQuaternion = new THREE.Quaternion();
	globalOrientationQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2); // Axis of rotation is x axis
	
	function buildPlanets(){
		planets.forEach(planet => {
	
			planet.mesh = getPlanetMesh(planet);
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
	
	function getSaturnRing (planet){
		const outerRadius = Math.pow(planet.ringRadius, 1/root)*radiusScalingFactor;
		const geometry = new THREE.RingGeometry(planet.scaledRadius, outerRadius);
		var pos = geometry.attributes.position;
		var v3 = new THREE.Vector3();
		for (let i = 0; i < pos.count; i++){
			v3.fromBufferAttribute(pos, i);
			geometry.attributes.uv.setXY(i, v3.length() < ((outerRadius+planet.scaledRadius)/2) ? 0 : 1, 1);
		}
		const material = new THREE.MeshBasicMaterial( {
			map: new THREE.TextureLoader().load(planet.ringImagePath),
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
	function getPlanetMesh(planet){
		const radius = radiusScalingFactor * Math.pow(planet.radius, 1/root)
		planet.scaledRadius = radius;
		const geometry = new THREE.SphereGeometry(radius);
		const material = new THREE.MeshBasicMaterial( {
			map: new THREE.TextureLoader().load(planet.imagePath)
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
	
		planet.A = planet.a + planet.a0 * T;
		planet.E = planet.e + planet.e0 * T;
		planet.I = planet.i + planet.i0 * T;
		planet.L = planet.l + planet.l0 * T;
		planet.W = planet.w + planet.w0 * T;
		planet.O = planet.o + planet.o0 * T;
	
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
		
		
		requestAnimationFrame( animate );
		controls.update();
		renderer.render( scene, camera );

		if(simulationState == state.playing) {

			simulationTime += simulationTimePassed;
			planets.forEach(planet => {
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
			planets.forEach(planet=>{
				planet.mesh.position.add(scaledTargetPosition)
				if(planet.id=="Saturn"){
					planet.ring.position.copy(planet.mesh.position)
				}
			})
			const sunPosition = getPlanetByID('Sun').mesh.position;
			planets.forEach(planet=>{
				planet.line.position.copy(sunPosition);
			})

			if(controlTarget != _previousTarget ){
				_previousTarget = controlTarget;
				cameraReset();
			}
		}
	}
	</script>

  <body id="page">

	<div id="header">
		<div class="header-control-div" style="border-width:thin;">
			<h5 style="min-width:200px;">{format(simulationTime, 'yyyy-MM-dd HH-mm-ss')}</h5>
			<div class="speed-div ctrl-div">
				<button on:click={toggleState} style="min-width:72px;"> {simulationState?"Pause":"Play"}</button>
				<label for="speed">Speed:</label>
				<input type="range" id="speed" name="speed" step="0.1" min="0" max="1000" bind:value={speedInput}/>
				<input type="number" bind:value={speedInput}>
				<select id="period" name = "period" class="select-ctrl" bind:value={period} >
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
				<select id="target" name="target" class="select-ctrl" bind:value={controlTarget}>
					{#each planets as planet}
						<option value={planet.id}>
							{planet.id}
						</option>
					{/each}
				</select>
			</div>
		</div>

	</div>
	<div id="scene" bind:this={canvasContainer}>
		<canvas bind:this={canvas} ></canvas>
	</div>
</body>


<style lang="scss">

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
		left:0;
		right:0;
		top:10px;
		border-color: white;
		border-width:thin;
		border:solid;
		padding:8px;
		margin:8px;
		display:flex;
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
		flex-direction: row;
		align-items: center;
		gap: 8px;
	}

	#period{
		height:min-content;
	}

	.header-control-div{

		display: flex;
		justify-content: space-between;
		width: 100%;
		margin: 0 16px;
	}

</style>
