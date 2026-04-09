import{useState,useEffect}from"react";
import{getPontos,savePonto,deletePonto,getContratosByPonto}from"../db";
import{Btn,Input,Select}from"../components/FormElements";
import Modal from"../components/Modal";

const TIPOS=[{value:"outdoor",label:"Outdoor"},{value:"frontlight",label:"Front-light"},{value:"backlight",label:"Back-light"},{value:"led",label:"Painel LED"},{value:"totem",label:"Totem"},{value:"busdoor",label:"Busdoor"},{value:"outro",label:"Outro"}];
const STATUS_FILTER=[{v:"todos",l:"Todos"},{v:"disponivel",l:"Disponíveis"},{v:"ocupado",l:"Ocupados"},{v:"manutencao",l:"Manutenção"}];

function badgePonto(status){
  if(status==="ocupado")return{bg:"rgba(14,165,233,.15)",cor:"#38bdf8",label:"Ocupado"};
  if(status==="manutencao")return{bg:"rgba(245,158,11,.15)",cor:"#f59e0b",label:"Manutenção"};
  return{bg:"rgba(34,197,94,.15)",cor:"#22c55e",label:"Disponível"};
}

export default function Pontos({user,onAbrirPonto}){
  const[pontos,setPontos]=useState([]);
  const[modal,setModal]=useState(false);const[deleteModal,setDeleteModal]=useState(null);
  const[edit,setEdit]=useState(null);const[filtro,setFiltro]=useState("todos");
  const[form,setForm]=useState({nome:"",endereco:"",tipo:"outdoor",largura:"",altura:"",iluminacao:false,trafego:"",obs:""});

  const recarregar=async()=>{
    const ps=await getPontos(user.email);
    // Atualizar status baseado em contratos ativos
    setPontos(ps);
  };
  useEffect(()=>{recarregar()},[user.email]);

  const abrirNovo=()=>{setEdit(null);setForm({nome:"",endereco:"",tipo:"outdoor",largura:"",altura:"",iluminacao:false,trafego:"",obs:"",foto:""});setModal(true)};
  const abrirEditar=(p)=>{setEdit(p);setForm({...p,largura:String(p.largura||""),altura:String(p.altura||"")});setModal(true)};

  const handleFoto=(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const img=new Image();
      img.onload=()=>{
        const maxW=800;const scale=Math.min(1,maxW/img.width);
        const canvas=document.createElement("canvas");canvas.width=img.width*scale;canvas.height=img.height*scale;
        canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
        setForm(f=>({...f,foto:canvas.toDataURL("image/jpeg",0.7)}));
      };img.src=ev.target.result;
    };reader.readAsDataURL(file);
  };

  const salvar=async()=>{
    if(!form.nome.trim())return;
    const p={...form,ownerEmail:user.email,status:form.status||"disponivel",largura:parseFloat(form.largura)||0,altura:parseFloat(form.altura)||0};
    if(edit)p.id=edit.id;
    await savePonto(p);setModal(false);await recarregar();
  };

  const excluir=async()=>{await deletePonto(deleteModal.id);setDeleteModal(null);await recarregar()};

  const filtrados=pontos.filter(p=>filtro==="todos"||p.status===filtro);
  const labels={outdoor:"Outdoor",frontlight:"Front-light",backlight:"Back-light",led:"Painel LED",totem:"Totem",busdoor:"Busdoor",outro:"Outro"};

  return(<div style={{padding:"0 4px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <h2 style={{color:"#f1f5f9",margin:0,fontSize:20,fontWeight:700}}>Pontos</h2>
      <button onClick={abrirNovo} style={{background:"linear-gradient(135deg,#0ea5e9,#0369a1)",border:"none",borderRadius:12,padding:"8px 16px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Novo Ponto</button>
    </div>

    <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
      {STATUS_FILTER.map(f=><button key={f.v} onClick={()=>setFiltro(f.v)} style={{padding:"6px 14px",borderRadius:20,border:"none",background:filtro===f.v?"#0ea5e9":"rgba(255,255,255,0.05)",color:filtro===f.v?"#fff":"#94a3b8",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{f.l}</button>)}
    </div>

    {filtrados.map(p=>{
      const b=badgePonto(p.status);
      return(<div key={p.id} style={{background:"#0f1623",borderRadius:18,marginBottom:10,border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden"}}>
        <div onClick={()=>onAbrirPonto(p)} style={{cursor:"pointer"}}>
          {p.foto&&<img src={p.foto} alt="foto" style={{width:"100%",height:140,objectFit:"cover",borderRadius:"16px 16px 0 0"}}/>}
          <div style={{padding:"16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                  <span style={{color:"#f1f5f9",fontWeight:700,fontSize:16}}>🖼️ {p.nome}</span>
                  <span style={{background:b.bg,color:b.cor,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{b.label}</span>
                </div>
                {p.endereco&&<a href={"https://maps.google.com/?q="+encodeURIComponent(p.endereco)} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{color:"#38bdf8",fontSize:12,textDecoration:"none",display:"block"}}>📍 {p.endereco}</a>}
                <div style={{color:"#475569",fontSize:11,marginTop:4,display:"flex",gap:10,flexWrap:"wrap"}}>
                  <span>{labels[p.tipo]||p.tipo}</span>
                  {p.largura>0&&p.altura>0&&<span>{p.largura}×{p.altura}m</span>}
                  {p.iluminacao&&<span>💡 Iluminado</span>}
                  {p.trafego&&<span>🚗 {p.trafego} veic/dia</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.04)",padding:"8px 16px",display:"flex",gap:8}}>
          <button onClick={()=>abrirEditar(p)} style={{background:"rgba(14,165,233,.08)",border:"1px solid rgba(14,165,233,.2)",borderRadius:8,padding:"5px 14px",color:"#38bdf8",fontSize:12,fontWeight:600,cursor:"pointer"}}>Editar</button>
          <button onClick={()=>setDeleteModal(p)} style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:8,padding:"5px 14px",color:"#ef4444",fontSize:12,fontWeight:600,cursor:"pointer"}}>Excluir</button>
        </div>
      </div>);
    })}

    {filtrados.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:"#475569"}}>
      <div style={{fontSize:36,marginBottom:8}}>🖼️</div>
      <div style={{fontSize:14}}>Nenhum ponto {filtro!=="todos"?badgePonto(filtro).label.toLowerCase():""}</div>
    </div>}

    <Modal open={modal} onClose={()=>setModal(false)} title={edit?"Editar Ponto":"Novo Ponto"}>
      <Input label="Nome do ponto" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Ex: Av. Paulista 1000"/>
      <Input label="Endereço" value={form.endereco||""} onChange={e=>setForm({...form,endereco:e.target.value})} placeholder="Rua, número, bairro"/>
      <Select label="Tipo" value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} options={TIPOS}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <Input label="Largura (m)" type="number" value={form.largura} onChange={e=>setForm({...form,largura:e.target.value})} placeholder="9"/>
        <Input label="Altura (m)" type="number" value={form.altura} onChange={e=>setForm({...form,altura:e.target.value})} placeholder="3"/>
      </div>
      <Input label="Fluxo estimado (veíc/dia)" type="number" value={form.trafego||""} onChange={e=>setForm({...form,trafego:e.target.value})} placeholder="Ex: 5000"/>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <input type="checkbox" id="ilum" checked={!!form.iluminacao} onChange={e=>setForm({...form,iluminacao:e.target.checked})} style={{width:18,height:18,accentColor:"#0ea5e9"}}/>
        <label htmlFor="ilum" style={{color:"#94a3b8",fontSize:14}}>Ponto iluminado</label>
      </div>
      {edit&&<Select label="Status" value={form.status||"disponivel"} onChange={e=>setForm({...form,status:e.target.value})} options={[{value:"disponivel",label:"Disponível"},{value:"ocupado",label:"Ocupado"},{value:"manutencao",label:"Manutenção"}]}/>}
      <Input label="Observações" value={form.obs||""} onChange={e=>setForm({...form,obs:e.target.value})} placeholder="Detalhes adicionais..."/>
      <div style={{marginBottom:16}}>
        <div style={{color:"#94a3b8",fontSize:12,marginBottom:6}}>Foto do ponto</div>
        {form.foto&&<img src={form.foto} alt="preview" style={{width:"100%",height:120,objectFit:"cover",borderRadius:10,marginBottom:8}}/>}
        <label style={{display:"flex",alignItems:"center",gap:8,background:"rgba(14,165,233,.08)",border:"1px solid rgba(14,165,233,.2)",borderRadius:10,padding:"8px 14px",cursor:"pointer",color:"#38bdf8",fontSize:13,fontWeight:600,position:"relative",overflow:"hidden"}}>
          📷 {form.foto?"Trocar foto":"Adicionar foto"}
          <input type="file" accept="image/*" onChange={handleFoto} style={{position:"absolute",inset:0,opacity:0,width:"100%",height:"100%",cursor:"pointer"}}/>
        </label>
        {form.foto&&<button onClick={()=>setForm(f=>({...f,foto:""}))} style={{background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer",marginTop:4}}>Remover foto</button>}
      </div>
      <Btn onClick={salvar}>{edit?"Salvar Alterações":"Cadastrar Ponto"}</Btn>
    </Modal>

    <Modal open={!!deleteModal} onClose={()=>setDeleteModal(null)} title="Excluir ponto">
      {deleteModal&&<>
        <p style={{color:"#94a3b8",fontSize:14,marginBottom:20,textAlign:"center"}}>Excluir o ponto <strong style={{color:"#f1f5f9"}}>{deleteModal.nome}</strong>? Todos os contratos e pagamentos vinculados serão perdidos.</p>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={()=>setDeleteModal(null)} color="rgba(255,255,255,0.06)" style={{flex:1,border:"1px solid rgba(255,255,255,0.08)",color:"#94a3b8"}}>Cancelar</Btn>
          <Btn onClick={excluir} color="linear-gradient(135deg,#ef4444,#dc2626)" style={{flex:1}}>Excluir</Btn>
        </div>
      </>}
    </Modal>
  </div>);
}
