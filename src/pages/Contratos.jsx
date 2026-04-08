import{useState,useEffect}from"react";
import{getContratos,getPontos}from"../db";
import Card from"../components/Card";

function fmt(v){return(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}
function fmtData(s){if(!s)return"";const[y,m,d]=s.split("-");return`${d}/${m}/${y}`}

export default function Contratos({user,onAbrirPonto}){
  const[contratos,setContratos]=useState([]);const[pontos,setPontos]=useState([]);
  const[filtro,setFiltro]=useState("ativos");const[busca,setBusca]=useState("");

  useEffect(()=>{(async()=>{
    const[cs,ps]=await Promise.all([getContratos(user.email),getPontos(user.email)]);
    setContratos(cs);setPontos(ps);
  })()},[user.email]);

  const getPonto=(pontoId)=>pontos.find(p=>p.id===pontoId);

  const diasRestantes=(c)=>{
    if(!c.dataFim)return null;
    return Math.floor((new Date(c.dataFim+"T12:00")-new Date())/(1000*60*60*24));
  };

  const HOJE=new Date().toISOString().slice(0,10);

  const filtrados=contratos.filter(c=>{
    if(busca&&!c.anunciante.toLowerCase().includes(busca.toLowerCase()))return false;
    if(filtro==="ativos")return c.status==="ativo"&&(!c.dataFim||c.dataFim>=HOJE);
    if(filtro==="vencendo"){
      if(c.status!=="ativo"||!c.dataFim)return false;
      const d=diasRestantes(c);return d!==null&&d>=0&&d<=30;
    }
    if(filtro==="vencidos")return c.status==="ativo"&&c.dataFim&&c.dataFim<HOJE;
    if(filtro==="encerrados")return c.status==="encerrado";
    return true;
  });

  const totalReceita=contratos.filter(c=>c.status==="ativo").reduce((s,c)=>s+(c.valorMensal||0),0);

  return(<div style={{padding:"0 4px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <h2 style={{color:"#f1f5f9",margin:0,fontSize:20,fontWeight:700}}>Contratos</h2>
      <div style={{background:"rgba(14,165,233,.1)",border:"1px solid rgba(14,165,233,.2)",borderRadius:12,padding:"6px 12px"}}>
        <div style={{color:"#38bdf8",fontSize:12,fontWeight:700}}>R$ {fmt(totalReceita)}/mês</div>
      </div>
    </div>

    <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="🔍 Buscar anunciante..." style={{width:"100%",padding:"11px 14px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,color:"#f1f5f9",fontSize:14,outline:"none",marginBottom:12,boxSizing:"border-box",colorScheme:"dark"}}/>

    <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
      {[{v:"ativos",l:"Ativos"},{v:"vencendo",l:"Vencendo ⚠️"},{v:"vencidos",l:"Vencidos 🔴"},{v:"encerrados",l:"Encerrados"},{v:"todos",l:"Todos"}].map(f=>
        <button key={f.v} onClick={()=>setFiltro(f.v)} style={{padding:"6px 14px",borderRadius:20,border:"none",background:filtro===f.v?"#0ea5e9":"rgba(255,255,255,0.05)",color:filtro===f.v?"#fff":"#94a3b8",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{f.l}</button>
      )}
    </div>

    {filtrados.map(c=>{
      const ponto=getPonto(c.pontoId);
      const dias=diasRestantes(c);
      return(<Card key={c.id} onClick={()=>ponto&&onAbrirPonto(ponto)}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2,flexWrap:"wrap"}}>
              <span style={{color:"#f1f5f9",fontWeight:700,fontSize:15}}>{c.anunciante}</span>
              <span style={{background:c.status==="ativo"?"rgba(34,197,94,.15)":"rgba(100,116,139,.15)",color:c.status==="ativo"?"#22c55e":"#64748b",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:12}}>{c.status==="ativo"?"Ativo":"Encerrado"}</span>
            </div>
            {ponto&&<div style={{color:"#64748b",fontSize:12}}>🖼️ {ponto.nome}</div>}
            {c.contato&&<div style={{color:"#475569",fontSize:11}}>📞 {c.contato}</div>}
            <div style={{color:"#0ea5e9",fontSize:12,fontWeight:600,marginTop:4}}>R$ {fmt(c.valorMensal)}/mês</div>
            <div style={{color:"#475569",fontSize:11}}>{fmtData(c.dataInicio)} — {fmtData(c.dataFim)||"Indeterminado"}</div>
          </div>
          {dias!==null&&c.status==="ativo"&&<div style={{background:dias<0?"rgba(239,68,68,.1)":dias<7?"rgba(239,68,68,.1)":dias<30?"rgba(245,158,11,.1)":"rgba(14,165,233,.08)",borderRadius:12,padding:"8px 10px",textAlign:"center",flexShrink:0,marginLeft:8}}>
            <div style={{color:dias<0?"#ef4444":dias<7?"#ef4444":dias<30?"#f59e0b":"#38bdf8",fontSize:18,fontWeight:800}}>{dias<0?Math.abs(dias):dias}</div>
            <div style={{color:"#64748b",fontSize:9}}>{dias<0?"atraso":"dias"}</div>
          </div>}
        </div>
      </Card>);
    })}

    {filtrados.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:"#475569"}}>
      <div style={{fontSize:36,marginBottom:8}}>📋</div>
      <div style={{fontSize:14}}>Nenhum contrato {filtro==="ativos"?"ativo":filtro==="vencendo"?"vencendo":filtro==="encerrados"?"encerrado":""}</div>
    </div>}
  </div>);
}
