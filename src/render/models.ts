import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

// One loader for every model the game draws from a file. The scenery is Draco compressed, and
// the decoder for that sits in /draco. Each file is fetched once, however many times it is used.
const draco = new DRACOLoader().setDecoderPath('/draco/');
const loader = new GLTFLoader().setDRACOLoader(draco);
const cache = new Map<string, Promise<GLTF>>();

export function loadModel(url: string): Promise<GLTF> {
  let model = cache.get(url);
  if (!model) {
    model = loader.loadAsync(url);
    cache.set(url, model);
  }
  return model;
}

// A copy of a loaded model's scene to place in the world. Copies share geometry and materials.
export async function placeModel(url: string): Promise<THREE.Object3D> {
  const gltf = await loadModel(url);
  return gltf.scene.clone(true);
}
