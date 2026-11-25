import {pipeline,env} from '/semantic-assets/runtime/transformers.web.js';
env.allowRemoteModels=false;env.allowLocalModels=true;env.localModelPath='/semantic-assets/models/';env.backends.onnx.wasm.wasmPaths='/semantic-assets/ort/';env.backends.onnx.wasm.numThreads=1;
let extractor;
self.onmessage=async({data})=>{try{if(!extractor){self.postMessage({id:data.id,type:'loading'});extractor=await pipeline('feature-extraction','Xenova/bge-small-en-v1.5',{dtype:'q8',device:'wasm'})}const tensor=await extractor('Represent this sentence for searching relevant passages: '+data.question,{pooling:'cls',normalize:true});self.postMessage({id:data.id,type:'done',vector:Array.from(tensor.data)})}catch{extractor=undefined;self.postMessage({id:data.id,type:'error'})}};
