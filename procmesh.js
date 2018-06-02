function MeshBuilder(numPoints, ringCount, segmentCount, radius) {
	var self = this;

	var numRings = (numPoints-1) * ringCount + 1;
	var numVerts = numRings * (segmentCount + 1);
	var numFaces = (numRings-1) * 2 * segmentCount;

	var ms = [];
	var ts = [];
	var ps = [];

	self.geometry = new THREE.BufferGeometry();

	function initGeometry() {
		var faces = [];

		var vertexBuffer = new Float32Array(numVerts*3);
		var normalBuffer = new Float32Array(numVerts*3);

		for(var p = 1; p < numRings; p++) {
			for (var i = 1; i <= segmentCount; i++) {
				var vertsPerRow = segmentCount + 1;
				var baseIndex = (p * vertsPerRow + i);

				var index0 = baseIndex;
				var index1 = baseIndex - 1;
				var index2 = baseIndex - vertsPerRow;
				var index3 = baseIndex - vertsPerRow - 1;

				faces.push(index0, index2, index1);
				faces.push(index2, index3, index1);
			}
		}

		self.geometry.setIndex( faces );

		var vertAttr = new THREE.Float32BufferAttribute(vertexBuffer, 3);
		vertAttr.dynamic = true;
		self.geometry.addAttribute('position',  vertAttr);	

		var normalAttr = new THREE.Float32BufferAttribute(normalBuffer, 3);
		normalAttr.dynamic = true;
		self.geometry.addAttribute('normal',  normalAttr);	
	}

	function updateRing(center, positions, normals, baseIndex, rot) {
		var angleInc = ( Math.PI * 2.0) / segmentCount;

		for(var i = 0; i <= segmentCount; i++) {
			var angle = angleInc * i;

			var unitPosition = new THREE.Vector3(0,0,0);
			unitPosition.x = Math.cos(angle);
			unitPosition.y = Math.sin(angle);

			unitPosition.applyQuaternion(rot);

			normals[baseIndex] 		= unitPosition.x;
			normals[baseIndex + 1]	= unitPosition.y;
			normals[baseIndex + 2]	= unitPosition.z;

			unitPosition.multiplyScalar(radius).add(center);

			positions[baseIndex] 		= unitPosition.x;
			positions[baseIndex + 1]	= unitPosition.y;
			positions[baseIndex + 2]	= unitPosition.z;

			baseIndex += 3;
		}
	}

	self.updateGeometry = function(cps) {
		var positions = self.geometry.attributes.position.array;
		var normals = self.geometry.attributes.normal.array;

		evalSpline(cps);

		var axis = new THREE.Vector3();
		var forward = new THREE.Vector3(0,0,-1);
		var rot = new THREE.Quaternion();
		for (var i = 0; i < ps.length; i++) {
			var baseIndex = i * (segmentCount + 1) * 3;

			axis.copy(forward).cross(ts[i]);
			var angle = forward.angleTo(ts[i]);
			rot.setFromAxisAngle(axis, angle);
			updateRing(ps[i], positions, normals, baseIndex, rot);

		}

		// for(var cp = 0; cp < cps.length-1; cp++) {
		// 	for(var ring = 0; ring < ringCount; ring++) {
		// 		var baseIndex = (cp * ringCount + ring) * (segmentCount + 1) * 3;
		// 		updateRing(cps[cp].position, positions, normals, baseIndex);
		// 	}
		// }

		// updateRing(cps[cps.length-1].position, positions, normals, cp * ringCount * (segmentCount + 1) * 3);

		self.geometry.attributes.position.needsUpdate = true;
		self.geometry.attributes.normal.needsUpdate = true;
	}

	function evalSpline(cps) {
		ms = [];
		ps = [];
		ts = [];

		// construct splines
		for (var i = 0; i < cps.length; i++) {
			ms.push (finiteDiffSlope (i, cps));
		}

		// ms [0] = -head.transform.forward;
		var xPrev = new THREE.Vector3();
		var pPrev = new THREE.Vector3();

		for (var i = 0; i < cps.length-1; i++) {
			var d = new THREE.Vector3();
			d.copy(cps [i+1].position).sub(cps [i].position);
			var l = d.length() / ringCount;
			d.normalize ();

			xPrev.copy(cps [i].position);
			pPrev.copy(cps [i].position);

			for (var j = 0; j < ringCount; j++) {
				var p = new THREE.Vector3();
				var x = new THREE.Vector3();

				x.copy(d);
				x.multiplyScalar(l);
				x.add(xPrev);
				
				// p.copy(cps[i].position);
				// var t = new THREE.Vector3(0,0,1);

				p.copy(evalSpline3D (x, ms, i, cps));
				var t = new THREE.Vector3().copy(p).sub(pPrev).normalize();

				ps.push (p);
				ts.push (t);

				xPrev = x;
				pPrev = p;
			}
		}

		// push last cp
		ps.push (cps[cps.length-1].position);
		ts.push (new THREE.Vector3(0,0,1));
	}

	function evalSpline3D(pos, ms, k, cps) {
		return new THREE.Vector3(	evalSpline1D(pos.x, ms, k, 0, cps),
									evalSpline1D(pos.y, ms, k, 1, cps),
									evalSpline1D(pos.z, ms, k, 2, cps));
	}

	function evalSpline1D(x, ms, k, coord, cps) {
		var xk = cps [k].position.toArray() [coord];
		var xk1 = cps [k + 1].position.toArray() [coord];
		var interval = xk1 - xk;

		if (interval == 0) {
			return xk;
		}

		var t = (x - xk) / interval;

		var h00 = (1 + 2 * t) * (1 - t) * (1 - t);
		var h10 = t * (1 - t) * (1 - t);
		var h01 = t * t * (3 - 2 * t);
		var h11 = t * t * (t - 1);

		var px = h00 * cps [k].position.toArray() [coord] + h10  * ms [k].toArray() [coord]
		           + h01 * cps [k + 1].position.toArray() [coord] + h11  * ms [k + 1].toArray() [coord];
		return px;
	}

	function finiteDiffSlope(index, cps) {
		var m = new THREE.Vector3();
		if (index == 0) {
			m.copy(cps [1].position).sub(cps [0].position);
		} else if (index == cps.length - 1) {
			m.copy(cps[cps.length-1].position).sub(cps[cps.length-2].position);
		} else {
			m.copy(cps[index+1].position).sub(cps[index-1].position);
			m.multiplyScalar(.5);
		}
		return m;
	}

	initGeometry();
}
