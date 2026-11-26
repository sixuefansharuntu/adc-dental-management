<script setup lang="ts">
import {ref,onMounted,onBeforeUnmount} from 'vue';
import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=workerUrl;
const props=defineProps<{bytes:Uint8Array}>();
const canvas=ref<HTMLCanvasElement|null>(null),page=ref(1),pages=ref(0),loading=ref(true),error=ref('');
let document:any=null,task:any=null,loadingTask:any=null,closed=false;
async function render(n:number){if(!document||!canvas.value||closed)return;loading.value=true;error.value='';try{const p=await document.getPage(n);if(closed)return;const bounds=p.getViewport({scale:1}),scale=Math.min(1.5,1400/bounds.width,1800/bounds.height),view=p.getViewport({scale});const surface=canvas.value;if(!surface)return;surface.width=Math.ceil(view.width);surface.height=Math.ceil(view.height);task=p.render({canvas:surface,canvasContext:surface.getContext('2d')!,viewport:view,annotationMode:0});await task.promise;if(!closed)page.value=n;}catch{if(!closed)error.value='本页暂时无法完整显示，请核对原文件；未将空白视为成功。';}finally{if(!closed)loading.value=false;task=null;}}
onMounted(async()=>{try{loadingTask=getDocument({data:props.bytes.slice(),isEvalSupported:false,enableXfa:false,disableAutoFetch:true,disableStream:true,useSystemFonts:true,maxImageSize:24000000});document=await loadingTask.promise;if(closed){await document.destroy();return;}pages.value=document.numPages;if(pages.value<1||pages.value>50)throw Error();await render(1);}catch{if(!closed){error.value='PDF暂时无法显示，请核对原扫描文件。';loading.value=false;}}});
onBeforeUnmount(()=>{closed=true;task?.cancel();void loadingTask?.destroy();document=null;});
</script>
<template><section class="qpdf" aria-label="证书PDF逐页预览"><div class="qpdf-nav"><button type="button" :disabled="loading||page<=1" @click="render(page-1)">上一页</button><span>第 {{page}} / {{pages||'—'}} 页</span><button type="button" :disabled="loading||page>=pages" @click="render(page+1)">下一页</button></div><p v-if="loading" role="status">正在显示PDF页面…</p><p v-if="error" role="alert">{{error}}</p><canvas ref="canvas" aria-label="证书PDF当前页" role="img" :hidden="!!error"/><p class="qpdf-help">仅显示页面内容，不提供文件中的脚本、表单或外部链接。</p></section></template>
<style scoped>.qpdf{min-width:0}.qpdf-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:15px 0}.qpdf-nav button{border:1px solid #dce5d7;background:#f6f8f3;padding:9px 15px;border-radius:8px;color:#305849}.qpdf-nav button:disabled{opacity:.45}.qpdf canvas{display:block;max-width:100%;max-height:60vh;object-fit:contain;margin:auto;background:white;border:1px solid #e2e7df}.qpdf-help,.qpdf p{font-size:12px;line-height:1.8;color:#718375}</style>
