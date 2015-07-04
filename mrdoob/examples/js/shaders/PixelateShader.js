THREE.PixelateShader = {

	uniforms: {

		"tDiffuse":   { type: "t", value: null },	
		"width": {type: "f", value: null},
		"height": {type: "f", value: null},
		"pixel_size": {type: "f", value:null}

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join("\n"),

	fragmentShader: [
		"varying vec2 vUv;",
		"uniform sampler2D tDiffuse;",
		"uniform float width;",
		"uniform float height;",
		"uniform float pixel_size;",

"		void main(void)",
"		{",
"    		float d = 1.0 / pixel_size;",
"    		vec2 tex_coords =vec2(vUv.x, vUv.y);;",
"",
"			int fx = int(tex_coords.s * width / pixel_size);",
"			int fy = int(tex_coords.t * height / pixel_size);",
"	",
"   	 		float s = pixel_size * (float(fx) + d) / width;",
"    		float t = pixel_size * (float(fy) + d) / height;",
"    ",
"    		gl_FragColor = texture2D(tDiffuse, vec2(s, t)).rgba;",
"}"
].join("\n")
};