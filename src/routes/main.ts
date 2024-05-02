import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';




let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
export const createScene = (el, window) => {
    const cameraFulcrum = 75;

    scene = new THREE.Scene(); //{background: new THREE.TextureLoader().load('8k_stars_milky_way.jpg')}
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.z = 100;
    camera.position.x = 0;
    camera.position.y = 0;
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: el });
    renderer.setSize( window.innerWidth, window.innerHeight );
    controls = new OrbitControls( camera, renderer.domElement );
    camera.position.set( 0, 20, 100 );
    controls.update();
    // document.body.appendChild( renderer.domElement );
    animate();
  }


// const renderer = new THREE.WebGLRenderer();



//controls.update() must be called after any manual changes to the camera's transform

let G = 6.674* Math.pow(10, -11);
let speed = 3600*24*36.5 / 2;
//Mass (10^24 kg)
let planets:any[] = [
    {id:"Sun",      imagePath:'lib/images/2k_sun.jpg',                 orbitalEccentricity:0,     mass:19890, orbitalPlaneAngle:0,    rotationalAxisAngle:7.25,   color:'yellow',     radius:69634,   dayInHours:588,     orbitDistance:0,        orbitTime:0 }, //
    {id:"Mercury",  imagePath:'lib/images/2k_mercury.jpg',             orbitalEccentricity:0.206, mass:0.330, orbitalPlaneAngle:7,    rotationalAxisAngle:0.1,    color:'gray',       radius:2439.7,  dayInHours:1407.6,    orbitDistance:36.8,     orbitTime:88*24*3600 },
    {id:"Venus",    imagePath:'lib/images/2k_venus_atmosphere.jpg',    orbitalEccentricity:0.007, mass:4.97,  orbitalPlaneAngle:3.39, rotationalAxisAngle:177,    color:'yellow',     radius:6051.8,  dayInHours:5832.5,    orbitDistance:67.2,     orbitTime:224.7*24*3600 },
    {id:"Earth",    imagePath:'lib/images/2k_earth_daymap.jpg',        orbitalEccentricity:0.055, mass:5.97,  orbitalPlaneAngle:0,    rotationalAxisAngle:23,     color:'blue',       radius:6371,    dayInHours:23.9,      orbitDistance:93,       orbitTime:365.2*24*3600},
    {id:"Mars",     imagePath:'lib/images/2k_mars.jpg',                orbitalEccentricity:0.094, mass:0.642, orbitalPlaneAngle:1.85, rotationalAxisAngle:25,     color:'red',        radius:3389.5,  dayInHours:24.6,      orbitDistance:141.6,    orbitTime:687*24*3600},
    {id:"Jupiter",  imagePath:'lib/images/2k_jupiter.jpg',             orbitalEccentricity:0.049, mass:1898,  orbitalPlaneAngle:1.31, rotationalAxisAngle:3,      color:'orange',     radius:69911,   dayInHours:9.9,       orbitDistance:483.6,    orbitTime:4331*24*3600},
    {id:"Saturn",   imagePath:'lib/images/2k_saturn.jpg',              orbitalEccentricity:0.052, mass:568,   orbitalPlaneAngle:2.49, rotationalAxisAngle:27,     color:'brown',      radius:58232,   dayInHours:10.7,      orbitDistance:886.5,    orbitTime:10747*24*3600},
    {id:"Uranus",   imagePath:'lib/images/2k_uranus.jpg',              orbitalEccentricity:0.047, mass:86.8,  orbitalPlaneAngle:0.77, rotationalAxisAngle:98,     color:'lightblue',  radius:25362,   dayInHours:17.2,      orbitDistance:1783.7,   orbitTime:30589*24*3600},
    {id:"Neptune",  imagePath:'lib/images/2k_neptune.jpg',             orbitalEccentricity:0.010, mass:102,   orbitalPlaneAngle:1.77, rotationalAxisAngle:30,     color:'darkblue',   radius:24622,   dayInHours:16.1,      orbitDistance:2795.2,   orbitTime:59800*24*3600},
]


let radiusScalingFactor = 1/(1.60934 * 10000)//1/20000;
function getPlanetMesh(planet:any){
    const radius = radiusScalingFactor * planet.radius
    console.log(radius);
    const geometry = new THREE.SphereGeometry(radius);
    const material = new THREE.MeshBasicMaterial( {
        // color: 0x00ff00,
        map: new THREE.TextureLoader().load(planet.imagePath)
    } );
    // const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });

    return new THREE.Mesh( geometry, material );
}

function getPlanetRotationSpeed(planet:any){
    if(!planet?.rotationSpeed){
        planet.rotationSpeed = (planet.spin?-1:1)*2*Math.PI / (planet.dayInHours * 3600) ;
    }
    return planet.rotationSpeed;
}

function rotatePlanetsAxis(planet:any){
    var rotationalAxisQuart = new THREE.Quaternion();
    rotationalAxisQuart.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 2*Math.PI *(planet.rotationalAxisAngle/360)); 
    planet.mesh.applyQuaternion(rotationalAxisQuart)
}



let orbitScalingFactor = (1/2800)*450 
planets.forEach(planet => {

    planet.mesh = getPlanetMesh(planet);
    getPlanetRotationSpeed(planet);

    const scaledOrbitDistance = orbitScalingFactor * planet.orbitDistance
    planet.curve = new THREE.EllipseCurve(0,0, scaledOrbitDistance, scaledOrbitDistance);

    planet.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(planet.curve.getSpacedPoints(100)), new THREE.LineBasicMaterial({
        color: planet?.color ?? 'yellow'
    }));
    planet.line.rotation.x = Math.PI/2;
    planet.orbitalInclineQuart = new THREE.Quaternion();
    planet.orbitalInclineQuart.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 2*Math.PI *(planet.orbitalPlaneAngle/360)); 
    planet.line.applyQuaternion(planet.orbitalInclineQuart)
    
    rotatePlanetsAxis(planet);
    
    scene.add(planet.mesh)
    scene.add(planet.line);
});


let clock = new THREE.Clock();
let delta = 1;

function getOrbitPosition(planet:any, timeElapsed:number){
 return (timeElapsed * speed * (1.0/(planet.orbitTime))) % 1;
}

// let i = 0;
// const axis0 = new THREE.Vector3(1, 0, 0);
// const axis1 = new THREE.Vector3(0, 1, 0);
// const angle = Math.PI/2;
// var rotation = new THREE.Matrix4().makeRotationY(0);
// var rotation1 = new THREE.Matrix4().makeRotationX(Math.PI);
// var rotation2 = new THREE.Matrix4().makeRotationZ(0);

var quaternion = new THREE.Quaternion();
quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2); // Axis of rotation is x axis
let first = true;
// rotation = rotation.multiply(new THREE.Matrix3().makeRotationY(0))
function animate() {
    delta = clock.getDelta();
    let t = clock.getElapsedTime();

	requestAnimationFrame( animate );
    controls.update();
	renderer.render( scene, camera );
    planets.forEach(planet => {
        let mesh = planet.mesh;
        mesh.rotation.y += planet.rotationSpeed * delta * speed;
        if(planet.id != "Sun"){
            let v = new THREE.Vector3;
            planet.curve.getPointAt(getOrbitPosition(planet, t), v)
            v.applyQuaternion(quaternion);
            v.applyQuaternion(planet.orbitalInclineQuart)
            // console.log(v)
            mesh.position.copy(v);

        }
    });
}
// animate();