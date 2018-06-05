var loader = new THREE.GLTFLoader();

var shakeTime = 10;
var shakeAmplitude = .3;

var basicWhiteMat = new THREE.MeshBasicMaterial( { color: "#FFFFFF" } );

loader.load(
	'meshes/wizmudtitle.gltf',
	function ( gltf ) {
		for(var i = 0; i < gltf.scene.children.length; i++) {
			var obj = gltf.scene.children[i];
			obj.position.add(new THREE.Vector3(0,0,0));
			obj.material = basicWhiteMat
			obj.material.side = THREE.DoubleSide;
			obj.scale = new THREE.Vector3(1,1,1);
			obj.scale.multiplyScalar(2);
			obj.offsetT = i;
			obj.update = function() {
				this.position.y = shakeAmplitude * Math.sin(this.offsetT + totalTime * Math.PI / (shakeTime));
			}
			updateList.push(obj);
		}

		gltf.scene.rotateY(-Math.PI / 2);

		gltf.scene.position.z -= 20;
		// scene.add(gltf.scene);
	},

	function ( xhr ) {	},

	function ( error ) {
		console.log( 'An error happened' + error);
	}
);

function StarMaker() {
	var self = this;

	var timeToSpawn = .2;
	var spawnTimer = timeToSpawn;

	self.update = function() {
		spawnTimer -= dt;
		if(spawnTimer < 0) {
			spawnTimer = timeToSpawn;
			var newStar = new Star(5);
			updateList.push(newStar);
		}
	}
}

function Star(ttl) {
	var self = this;
	var sizeInc = (.001 * Math.random()) / ttl;

	var geometry = new THREE.BoxGeometry( 1, 1, 1 );
	var cube = new THREE.Mesh( geometry, basicWhiteMat );
	scene.add(cube);
	cube.scale.multiplyScalar(.07);
	cube.scale.z = .001;
	cube.position.set(Math.random()-.5, Math.random()-.5, 0);
	cube.position.multiplyScalar(30);
	cube.position.z = -10;
	

	self.update = function() {
		ttl -= dt;
		if(ttl < 0) {
			scene.remove(cube);
			geometry.dispose();
			destroyList.push(self);
		} else {
			cube.scale.add(new THREE.Vector3(sizeInc, sizeInc, 0));
		}
	}
}

var starMaker = new StarMaker();
updateList.push(starMaker);


