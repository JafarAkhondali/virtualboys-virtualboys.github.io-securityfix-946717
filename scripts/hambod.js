
var HAMBOD = {
	radius: 0,
	segmentCount: 0,
	ringCount: 0,
	numCps: 0,
	stiffness: 0,
	shader: '',
	rotate: false,
	rotateTime: 20,

	WIREFRAME: 'wireframe',
	PHONG: 'phong',
	LAMBERT: 'lambert',
	TOON: 'toon'
};

var scene = new THREE.Scene();
var updateList = [];
var destroyList = [];

var camera = new THREE.PerspectiveCamera( 50, window.innerWidth/window.innerHeight, 0.1, 1000 );
camera.position.z = 4;

var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
scene.add( directionalLight );
var light = new THREE.AmbientLight( 0x404040 ); // soft white light
scene.add( light );

// var controls = new THREE.OrbitControls( camera );
var bodyMat;

var wireframeMat = new THREE.MeshBasicMaterial( { color: "#433F81" } );
wireframeMat.wireframe = true;

var phongMat = new THREE.MeshPhongMaterial( { color: "#F33F81" } );
phongMat.side = THREE.DoubleSide;

var lambertMat = new THREE.MeshLambertMaterial( { color: "#AABBCC" } );
lambertMat.side = THREE.DoubleSide;

var toonMat;
var loader = new THREE.TextureLoader();
loader.load(
	'textures/toonramp2.png',
	function ( texture ) {
		texture.magFilter = THREE.NearestFilter;
		texture.minFilter = THREE.NearestFilter;
		toonMat = new THREE.MeshToonMaterial( { color: "#FFFFFF" , gradientMap: texture} );
		toonMat.side = THREE.DoubleSide;
		toonMat.shininess = 0;
	},
	undefined,
	function ( err ) {
		console.error( 'An error happened loading toonramp.' );
	}
);

var webGLCanvas = document.getElementById("webGLCanvas");
var renderer = new THREE.WebGLRenderer({ antialias: false, canvas: webGLCanvas });
renderer.setClearColor("#000000");
renderer.setSize( window.innerWidth, window.innerHeight );

var mousePos = new THREE.Vector3(.5,.5,0);
if(isMobile()) {
	console.log('is mobile');
	if (window.DeviceOrientationEvent) {
		console.log('dev orientation');
		window.addEventListener("deviceorientation", function () {
			onTilt([event.beta, event.gamma]);
		}, true);
	} else if (window.DeviceMotionEvent) {
		console.log('device motion');
		window.addEventListener('devicemotion', function () {
			onTilt([event.acceleration.x * 2, event.acceleration.y * 2]);
		}, true);
	} else {
		console.log('moz orientation');
		window.addEventListener("MozOrientation", function () {
			onTilt([orientation.x * 50, orientation.y * 50]);
		}, true);
	}
} else {
	console.log('not mobile!');
	document.onmousemove = function(e){
		mousePos.x = e.clientX / window.innerWidth;
		mousePos.y = e.clientY / window.innerHeight;
	}
}

const onTilt = (x, y) => {
	console.log('on tilt: ', x, y);
	if(x && y) {
		mousePos.x += x * .1;
		mousePos.x = mousePos.x.clamp(0, 1);
		mousePos.y += y * .1;
		mousePos.y = mousePos.y.clamp(0, 1); 
	}
}

var world = new CANNON.World();
world.gravity.set(0, 0, 0); 
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;

function initBod(xOffset, radius, segmentCount, ringCount, numCps, stiffness, shader, rotate) {
	HAMBOD.radius = radius;
	HAMBOD.segmentCount = segmentCount;
	HAMBOD.ringCount = ringCount;
	HAMBOD.numCps = numCps;
	HAMBOD.stiffness = stiffness;
	HAMBOD.bodyMat = getShader(shader);
	HAMBOD.xOffset = xOffset;
	HAMBOD.rotate = rotate !== undefined;

	createBod();
}


var mouseBody;
var mouseZ;
var bodyMesh, meshBuilder;
var sphereMeshes = [];
var sphereBodies = [];
var springs = [];

function createBod() {
	var points = [];
	for(var i = 0; i < HAMBOD.numCps; i++) {
		var offset = -i*2;
		points.push(new THREE.Vector3(0,0,offset));
	}

	// clean up old bod
	if(bodyMesh) {
		for(var i = 0; i < sphereBodies.length; i++) {
			world.removeBody(sphereBodies[i]);
		}

		scene.remove(bodyMesh);
		meshBuilder.dispose();
	}

	sphereMeshes = [];
	sphereBodies = [];
	springs = [];

	var r = .3;
	for(var i = 0; i < points.length; i++) {
		var newMesh = new THREE.Mesh( new THREE.SphereBufferGeometry( r, 20, 10 ), wireframeMat );
		newMesh.position.copy(points[i]);
		// scene.add( newMesh );
		sphereMeshes.push(newMesh);

		var sphereBody = new CANNON.Body({
			mass: 1, // kg
			position: CANNONVec(points[i]), // m
			shape: new CANNON.Sphere(r),
			linearDamping: .5
		});

		if(i == 0) {
			sphereBody.type = CANNON.Body.STATIC;
			sphereBody.position = CANNONVec(camera.position);
			sphereBody.position.x += HAMBOD.xOffset;
			sphereBody.position.y -= 2;
			sphereBody.position.z += 1;
		} else {
			var spring = new CANNON.Spring(sphereBodies[sphereBodies.length-1], sphereBody,{
	            localAnchorA: new CANNON.Vec3(0,0,0),
	            localAnchorB: new CANNON.Vec3(0,0,0),
	            restLength : 0,
	            stiffness : HAMBOD.stiffness,
	            damping : 1,
	        });
	        springs.push(spring);
		}

		if(i == points.length-1) {
			mouseBody = sphereBody;
			mouseBody.type = CANNON.Body.STATIC;

			mouseZ = new THREE.Vector3().copy(points[i]).project(camera).z
		}

		world.addBody(sphereBody);
		sphereBodies.push(sphereBody);
	}


	meshBuilder = new MeshBuilder(points.length, HAMBOD.ringCount, HAMBOD.segmentCount, HAMBOD.radius);
	meshBuilder.updateGeometry(sphereMeshes);

	bodyMesh = new THREE.Mesh( meshBuilder.geometry, HAMBOD.bodyMat );
	scene.add( bodyMesh );
}

function rotateBody() {
	var theta = totalTime * 2 * Math.PI / HAMBOD.rotateTime;
	sphereBodies[0].position = new CANNON.Vec3(HAMBOD.xOffset * Math.cos(theta), HAMBOD.xOffset * Math.sin(theta), sphereBodies[0].position.z);
}

function syncMeshWithBody(mesh, body) {
	mesh.position.x = body.position.x;
	mesh.position.y = body.position.y;
	mesh.position.z = body.position.z;
	mesh.quaternion.x = body.quaternion.x;
	mesh.quaternion.y = body.quaternion.y;
	mesh.quaternion.z = body.quaternion.z;
	mesh.quaternion.w = body.quaternion.w;
}

function syncModelPositions() {
	for(var i = 0; i < sphereBodies.length; i++) {
		syncMeshWithBody(sphereMeshes[i], sphereBodies[i]);
	}
}

function updateMouseBody() {
	var mouseWorldPos = new THREE.Vector3(-.5,-.5,0).add(mousePos);
	mouseWorldPos.multiplyScalar(2);
	mouseWorldPos.y *= -1;
	mouseWorldPos.z = mouseZ;
	mouseWorldPos.unproject(camera);
	mouseBody.position = CANNONVec(mouseWorldPos);
}


var fixedTimeStep = 1.0 / 60.0; // seconds
var maxSubSteps = 3;
var lastTime;
var dt = 0, totalTime;

function startLoop(time) {
	requestAnimationFrame(startLoop);
	if(lastTime !== undefined) {
		dt = (time - lastTime) / 1000;
		world.step(fixedTimeStep, dt, maxSubSteps);
	}

	lastTime = time;
	totalTime = time / 1000;

	// onTilt(.02, .01);

	if(mouseBody) {
		updateMouseBody();
	}

	syncModelPositions();

	if(meshBuilder) {
		if(HAMBOD.rotate) {
			rotateBody();
		}

		meshBuilder.updateGeometry(sphereMeshes);
	}

	for(var i = 0; i < updateList.length; i++) {
		updateList[i].update();
	}

	for(var i = 0; i < destroyList.length; i++) {
		var index = updateList.indexOf(destroyList[i]);
		if (index > -1) {
			updateList.splice(index, 1);
		}
	}

	destroyList = [];

	// controls.update();
	renderer.render(scene, camera);
}

world.addEventListener("postStep",function(event){
	for(var i = 0; i < springs.length; i++) {
    	springs[i].applyForce();
	}
});

function setSpringStiffness(val) {
	HAMBOD.stiffness = val;
	for(var i = 0; i < springs.length; i++) {
		springs[i].stiffness = val;
	}
}

function setNumCPS(val) {
	HAMBOD.numCps = val;
	createBod();
}

function setSegmentCount(val) {
	HAMBOD.segmentCount = val;
	createBod();
}

function setRadius(val) {
	HAMBOD.radius = val;
	createBod();	
}

function getShader(shaderName) {
	switch(shaderName) {
	case HAMBOD.WIREFRAME:
		return wireframeMat;
	case HAMBOD.PHONG:
		return phongMat;
	case HAMBOD.TOON:
		return toonMat;
	case HAMBOD.LAMBERT:
		return lambertMat;
	default:
		console.log("Unknown shader: " + shaderName);
		return null;
	}
}

function setShader(val) {
	HAMBOD.bodyMat = getShader(val);
	bodyMesh.material = HAMBOD.bodyMat;
}

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}
