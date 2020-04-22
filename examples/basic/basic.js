// when page is ready
TETSUO.Utils.ready(() => {
    // initialize scene in basic mode
    // returns a node where objects can be added
    let { scene, node } = new TETSUO.Scene({
        viewportElement: document.getElementById("viewport"),
        dev: true,
    }).basic();

    // add an object
    let object = new THREE.Mesh(
        new THREE.SphereGeometry(20, 20, 20),
        new THREE.MeshLambertMaterial({ color: 0xff0000 })
    );
    node.add(object);

    // add a light
    node.add(new THREE.DirectionalLight(0xffffff, 0.5));

    // start animation loop
    scene.animate((time) => {
        time /= 5;
        object.position.set(Math.sin(time) * 10, Math.cos(time) * 10, 0);
    });
});
