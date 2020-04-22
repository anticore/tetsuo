TETSUO.Utils.ready(() => {
    // create a new tetsuo scene
    let scene = new TETSUO.Scene({ dev: true });

    // create a new three.js scene node
    // this node renders a three.js scene to a texture
    let cubeScene = new TETSUO.THREENode("cubeScene", scene.renderer);

    // add a cube to the scene
    let cube = new THREE.Mesh(new THREE.BoxGeometry(50, 50, 50), new THREE.MeshStandardMaterial());
    cubeScene.add(cube);

    // rotate cube when scene updates
    cubeScene.onUpdate((time) => {
        time /= 10;
        cube.rotation.set(Math.sin(time), Math.cos(time), 0);
    });

    // add a red light
    let lightR = new THREE.PointLight(0xff0000, 1, 100);
    lightR.position.set(50, 50, 60);
    cubeScene.add(lightR);

    // add a green light
    let lightG = new THREE.PointLight(0x00ff00, 1, 100);
    lightG.position.set(0, -50, 50);
    cubeScene.add(lightG);

    // add a blue light
    let lightB = new THREE.PointLight(0x0000ff, 1, 100);
    lightB.position.set(-50, -50, 70);
    cubeScene.add(lightB);

    // create a shader node
    // shader nodes can receive the render of other nodes as texture uniforms
    // this node will receive the cube scene render
    // and three uniforms to control the color filter
    let colorFilter = new TETSUO.ShaderNode("colorFilter", scene.renderer, {
        fragmentShader: /* glsl */ `
            varying vec2 vUv;
            uniform sampler2D cubeScene;
            uniform float r;
            uniform float g;
            uniform float b;

            void main() {
                vec4 t = texture2D(cubeScene, vUv);
                gl_FragColor = vec4(t.r * r, t.b * b, t.g * g, 1.);
            }
        `,
    });

    // connect the output of cube scene to the color filter node
    cubeScene.connectTo(colorFilter);

    // create new uniform node for red color
    let uniformR = new TETSUO.UniformNode("r", {
        value: 1,
        gui: {
            step: 0.1,
            minValue: 0,
            maxValue: 1,
        },
    });

    // create new uniform node for green color
    let uniformG = new TETSUO.UniformNode("g", {
        value: 1,
        gui: {
            step: 0.1,
            minValue: 0,
            maxValue: 1,
        },
    });

    // create new uniform node for blue color
    let uniformB = new TETSUO.UniformNode("b", {
        value: 1,
        gui: {
            step: 0.1,
            minValue: 0,
            maxValue: 1,
        },
    });

    // connect uniforms to the color filter node
    uniformR.connectTo(colorFilter);
    uniformG.connectTo(colorFilter);
    uniformB.connectTo(colorFilter);

    // finally connect the output of the color filter to the screen
    scene.connectToScreen(colorFilter);

    // start animating the scene
    scene.animate();
});