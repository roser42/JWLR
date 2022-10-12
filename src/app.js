import * as THREE from 'three';
import {EXRLoader} from 'three/examples/jsm/loaders/EXRLoader';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {SVGLoader} from 'three/examples/jsm/loaders/SVGLoader';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils';

import aSvg from '../build/assets/svgs/a.svg';
import jwlrLogoSvg from '../build/assets/svgs/JWLR_logo.svg';
import niravanaLogoSvg from '../build/assets/svgs/Nirvana.svg';

let camera, scene, renderer, controls, cnv;
let material, objMesh;
let envMap;
let clock, delta = 0;
let mousedown = false;

let WIDTH = 1024,
    HEIGHT = 1024;
window.innerWidth > window.innerHeight
    ? (WIDTH = window.innerHeight, HEIGHT = window.innerHeight)
    : (WIDTH = window.innerWidth, HEIGHT = window.innerWidth);

const params = {
    roughness: 0.1,
    metalness: 1.0,
    exposure: 1.3,
    cameraPos: new THREE.Vector3(0, 0, 300)
};
if (isMobileDevice()) {
    params.cameraPos.z = params.cameraPos.z -= 60;
}

init();

function init() {
    clock = new THREE.Clock();
    camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 1, 1000);
    camera.position.set(...params.cameraPos);

    scene = new THREE.Scene();
    scene.background = new THREE.TextureLoader().load(
        'assets/textures/backGr.png', function (texture) {
            texture.encoding = THREE.sRGBEncoding;
            texture.dispose();
        });

    cnv = document.getElementById('three_cnv');
    renderer = new THREE.WebGLRenderer(
        {
            antialias: true,
            canvas: cnv
        });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(WIDTH, HEIGHT);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.physicallyCorrectLights = true;
    renderer.setAnimationLoop(animate);

    //

    material = new THREE.MeshStandardMaterial({
        metalness: params.metalness,
        roughness: params.roughness,
        envMapIntensity: 1.0,
    });
    new EXRLoader()
        .load('assets/textures/360_Sky_min.exr', function (texture) {
                envMap = pmremGenerator.fromEquirectangular(texture);
                texture.dispose();
            },
            function (xhr) {

                //console.log(('EXR ' + xhr.loaded / xhr.total * 100) + '% loaded');

            },
        );


    THREE.DefaultLoadingManager.onLoad = function () {
        pmremGenerator.dispose();
    };

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 50;
    controls.maxDistance = params.cameraPos.z + 150;

    setMouseEvents();

    let targetSvg = localStorage.getItem('user_svg');
    loadSvg(targetSvg ?? jwlrLogoSvg);
}

function loadSvg(path) {
    scene.remove(objMesh);
    const svgMarkup = path;
    const loader = new SVGLoader();
    const svgData = loader.parse(svgMarkup);

    const svgGroup = new THREE.Group();
    svgGroup.scale.y *= -1;

    svgData.paths.forEach((path) => {
        const shapes = SVGLoader.createShapes(path);

        // Each path has array of shapes
        shapes.forEach((shape) => {
            // Finally we can take each shape and extrude it
            let extrudeGeom = new THREE.ExtrudeGeometry(shape, {
                depth: 15,
                bevelEnabled: true,
                bevelThickness: 3,
                bevelSize: 3,
                bevelOffset: 0,
                bevelSegments: 5,
            });
            extrudeGeom.deleteAttribute('normal');
            let geometry = mergeVertices(extrudeGeom);
            geometry.computeVertexNormals();

            const mesh = new THREE.Mesh(geometry, material);
            mesh.scale.set(0.2, 0.2, 0.2);
            svgGroup.add(mesh);
        });
    });

    const box = new THREE.Box3().setFromObject(svgGroup);
    const size = new THREE.Vector3();
    box.getSize(size);

    const yOffset = size.y / -2;
    const xOffset = size.x / -2;

// Offset all of group's elements, to center them
    svgGroup.children.forEach(item => {
        item.position.x = xOffset;
        item.position.y = yOffset;
    });

    objMesh = svgGroup;
    scene.add(svgGroup);
}

function setMouseEvents() {
    renderer.domElement.addEventListener('pointerdown', () => {
        mousedown = true;
    }, false);
    renderer.domElement.addEventListener('pointerup', () => {
        mousedown = false;
    }, false);
}

function animate() {
    render();
}

function render() {
    delta = clock.getDelta();

    let map = envMap ? envMap.texture : null;
    if (!material.envMap) {
        material.envMap = map;
    }

    if (objMesh && !mousedown) {
        objMesh.rotation.y += 1.3 * delta;
    }

    renderer.toneMappingExposure = params.exposure;

    renderer.render(scene, camera);
}

//user ui

const loadSvgButton = document.getElementById('load_svg');
const selectSvg = document.getElementById('svgs_select');

loadSvgButton.addEventListener('click', (event) => {
    let input = document.createElement('input');
    input.type = 'file';
    input.onchange = e => {
        let file = e.target.files[0];
        let reader = new FileReader();
        let extension = input.files[0].name.split('.').pop().toLowerCase();
        if (extension !== 'svg') {
            alert('Please load only svg files!');
            return;
        }
        reader.readAsText(file, 'UTF-8');
        reader.onload = readerEvent => {
            let content = readerEvent.target.result.toString();
            selectSvg.value = '';
            changeSvg(content);
        }
    }
    input.click();
});

selectSvg.addEventListener('change', () => {
    switch (selectSvg.value) {
        case '':
            break;
        case 'A':
            changeSvg(aSvg);
            break;
        case 'Nirvana_logo':
            changeSvg(niravanaLogoSvg);
            break;
        case 'JWLR':
            changeSvg(jwlrLogoSvg);
            break;
    }
});

function changeSvg(svg) {
    localStorage.setItem('user_svg', svg);
    loadSvg(svg);
}

function isMobileDevice() {
    let check = false;
    (function (a) {
        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
}