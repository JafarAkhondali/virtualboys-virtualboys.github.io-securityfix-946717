
var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera( 50, window.innerWidth/window.innerHeight, 0.1, 1000 );
camera.position.z = 4;

var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
scene.add( directionalLight );
var light = new THREE.AmbientLight( 0x404040 ); // soft white light
scene.add( light );

var controls = new THREE.OrbitControls( camera );
var basicMat = new THREE.MeshBasicMaterial( { color: "#433F81" } );
var phongMat = new THREE.MeshPhongMaterial( { color: "#F33F81" } );

var renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setClearColor("#000000");
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var mousePos = new THREE.Vector3(0,0,0);
document.onmousemove = function(e){
    mousePos.x = e.pageX / window.innerWidth;
    mousePos.y = e.pageY / window.innerHeight;
}


var world = new CANNON.World();
world.gravity.set(0, 0, 0); // m/s²
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 50;



var radius = .2;
var segmentCount = 5;
var ringCount = 4;
var numCps = 6;

var points = [];
for(var i = 0; i < numCps; i++) {
	var offset = -i*2;
	points.push(new THREE.Vector3(0,0,offset));
}

var sphereMeshes = [];
var sphereBodies = [];
var springs = [];
var mouseBody;
var mouseZ;
var r = .3;
for(var i = 0; i < points.length; i++) {
	var newMesh = new THREE.Mesh( new THREE.SphereBufferGeometry( r, 20, 10 ), basicMat );
	newMesh.position.copy(points[i]);
	scene.add( newMesh );
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
		sphereBody.position.y -= 2;
		sphereBody.position.z += 1;
	} else {
		var spring = new CANNON.Spring(sphereBodies[sphereBodies.length-1], sphereBody,{
            localAnchorA: new CANNON.Vec3(0,0,0),
            localAnchorB: new CANNON.Vec3(0,0,0),
            restLength : 1,
            stiffness : 20,
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


var meshBuilder = new MeshBuilder(points.length, ringCount, segmentCount, radius);
meshBuilder.updateGeometry(sphereMeshes);

var cube = new THREE.Mesh( meshBuilder.geometry, phongMat );

// Add cube to Scene
scene.add( cube );

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

(function simloop(time) {
	requestAnimationFrame(simloop);
	if(lastTime !== undefined) {
		var dt = (time - lastTime) / 1000;
		world.step(fixedTimeStep, dt, maxSubSteps);
	}

	lastTime = time;

	updateMouseBody();

	syncModelPositions();
	meshBuilder.updateGeometry(sphereMeshes);

	controls.update();
	renderer.render(scene, camera);
})();

world.addEventListener("postStep",function(event){
	for(var i = 0; i < springs.length; i++) {
    	springs[i].applyForce();
	}
});
