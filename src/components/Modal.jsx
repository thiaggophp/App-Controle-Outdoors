import{useEffect,useRef}from"react";
export default function Modal({open,onClose,title,children}){
  const ignore=useRef(false);
  const contentRef=useRef(null);
  const timerRef=useRef(null);

  const setIgnore=(ms)=>{
    ignore.current=true;
    clearTimeout(timerRef.current);
    timerRef.current=setTimeout(()=>{ignore.current=false},ms);
  };

  useEffect(()=>{document.body.style.overflow=open?"hidden":""},[open]);

  // Guarda galeria (troca de app → visibilitychange dispara)
  useEffect(()=>{
    const fn=()=>{
      if(document.hidden){ignore.current=true;clearTimeout(timerRef.current);}
      else{setIgnore(1500);}
    };
    document.addEventListener("visibilitychange",fn);
    return()=>{document.removeEventListener("visibilitychange",fn);clearTimeout(timerRef.current);};
  },[]);

  // Guarda câmera: detecta toque no input/label (abre câmera) e change (foto confirmada)
  useEffect(()=>{
    const content=contentRef.current;
    if(!content)return;

    // Ao tocar na área de foto: bloqueia backdrop por até 60s (câmera pode demorar)
    const onPointer=(e)=>{
      const label=e.target.closest("label");
      if(e.target.type==="file"||(label&&label.querySelector("input[type='file']"))){
        setIgnore(60000);
      }
    };

    // Foto confirmada (onChange): reinicia proteção por 1.5s (click sintético chega aqui)
    const onFileChange=(e)=>{
      if(e.target.type==="file"){setIgnore(1500);}
    };

    content.addEventListener("pointerdown",onPointer,true);
    content.addEventListener("change",onFileChange,true);
    return()=>{
      content.removeEventListener("pointerdown",onPointer,true);
      content.removeEventListener("change",onFileChange,true);
    };
  },[open]);

  if(!open)return null;
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn .2s ease"}} onClick={e=>{if(e.target===e.currentTarget&&!ignore.current)onClose()}}>
    <div ref={contentRef} style={{background:"#0f1623",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"24px 20px 40px",animation:"slideUp .25s ease",maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h3 style={{color:"#f1f5f9",fontSize:17,fontWeight:700}}>{title}</h3>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:10,width:32,height:32,color:"#64748b",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
      </div>
      {children}
    </div>
  </div>);
}
