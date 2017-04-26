THREE.LensShader = {

	uniforms: {

		"tDiffuse":   { type: "t", value: null },
		"k":       { type: "f", value: 0.3 },
		"kcube": { type: "f", value: 1.8	 },
		"scale": { type: "f", value: .7},
		"blurAmount": { type: "f", value: .1},
		"dispersion":     { type: "f", value: .06 },
		"blurEnabled":  { type: "f", value: 1}

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
		"uniform float k, kcube, scale, dispersion, blurAmount; //k = 0.2, kcube = 0.3, scale = 0.9, dispersion = 0.01",
		"uniform float blurEnabled;",

		"vec2 rand(vec2 co) //needed for fast noise based blurring",
		"{",
			"float noise1 =  (fract(sin(dot(co ,vec2(12.9898,78.233))) * 43758.5453));",
			"float noise2 =  (fract(sin(dot(co ,vec2(12.9898,78.233)*2.0)) * 43758.5453));",
			"return clamp(vec2(noise1,noise2),0.0,1.0);",
		"}",

		"vec3 blur(vec2 coords)",
		"{",
			"vec2 noise = rand(gl_FragCoord.xy);",
			"float tolerance = 0.2;",
			"float vignette_size = 0.5;",
			"vec2 powers = pow(abs(vec2(gl_FragCoord.x - 0.5,gl_FragCoord.y - 0.5)),vec2(2.0));",
			"float radiusSqrd = pow(vignette_size,2.0);",
			"float gradient = smoothstep(radiusSqrd-tolerance, radiusSqrd+tolerance, powers.x+powers.y);",

			"vec4 col = vec4(0.0);",

			"float X1 = coords.x + blurAmount * noise.x*0.004 * gradient;",
			"float Y1 = coords.y + blurAmount * noise.y*0.004 * gradient;",
			"float X2 = coords.x - blurAmount * noise.x*0.004 * gradient;",
			"float Y2 = coords.y - blurAmount * noise.y*0.004 * gradient;",
			
			"float invX1 = coords.x + blurAmount * ((1.0-noise.x)*0.004) * (gradient * 0.5);",
			"float invY1 = coords.y + blurAmount * ((1.0-noise.y)*0.004) * (gradient * 0.5);",
			"float invX2 = coords.x - blurAmount * ((1.0-noise.x)*0.004) * (gradient * 0.5);",
			"float invY2 = coords.y - blurAmount * ((1.0-noise.y)*0.004) * (gradient * 0.5);",

			
			"col += texture2D(tDiffuse, vec2(X1, Y1))*0.1;",
			"col += texture2D(tDiffuse, vec2(X2, Y2))*0.1;",
			"col += texture2D(tDiffuse, vec2(X1, Y2))*0.1;",
			"col += texture2D(tDiffuse, vec2(X2, Y1))*0.1;",
			
			"col += texture2D(tDiffuse, vec2(invX1, invY1))*0.15;",
			"col += texture2D(tDiffuse, vec2(invX2, invY2))*0.15;",
			"col += texture2D(tDiffuse, vec2(invX1, invY2))*0.15;",
			"col += texture2D(tDiffuse, vec2(invX2, invY1))*0.15;",
			
			"return col.rgb;",
		"}",

		"void main(void)",
		"{",

			//index of refraction of each color channel, causing chromatic dispersion
			"vec3 eta = vec3(1.0+dispersion*0.9, 1.0+dispersion*0.6, 1.0+dispersion*0.3);",
			
			//texture coordinates
			"vec2 texcoord = vUv;",
			
			//canvas coordinates to get the center of rendered viewport
			//vec2 cancoord = gl_TexCoord[0].st;
			//"vec2 cancoord = gl_TexCoord[3].st;",

			"float r2 = (texcoord.x-0.5) * (texcoord.x-0.5) + (texcoord.y-0.5) * (texcoord.y-0.5);",    

			"float f = 0.0;",

		 

			//only compute the cubic distortion if necessary
			
			"if( kcube == 0.0)",
			"{",
				"f = 1.0 + r2 * k;",
			"}else{",
				"f = 1.0 + r2 * (k + kcube * sqrt(r2));",
			"};",
		  

			// get the right pixel for the current position
			
			"vec2 rCoords = (f*eta.r)*scale*(texcoord.xy-0.5)+0.5;",
			"vec2 gCoords = (f*eta.g)*scale*(texcoord.xy-0.5)+0.5;",
			"vec2 bCoords = (f*eta.b)*scale*(texcoord.xy-0.5)+0.5;",

			"vec3 inputDistort = vec3(0.0);", 
			
			"inputDistort.r = texture2D(tDiffuse,rCoords).r;",
			"inputDistort.g = texture2D(tDiffuse,gCoords).g;",
			"inputDistort.b = texture2D(tDiffuse,bCoords).b;",
			
			"if (blurEnabled==1.0)",
			"{",
				"inputDistort.r = blur(rCoords).r;",
				"inputDistort.g = blur(gCoords).g;",
				"inputDistort.b = blur(bCoords).b;",
			"}",
			
			"gl_FragColor = vec4(inputDistort.r,inputDistort.g,inputDistort.b,1.0);",
		"}"].join("\n")
};

