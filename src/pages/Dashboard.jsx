import{useState,useEffect}from"react";
import{getPontos,getContratos,getPagamentos}from"../db";
import Card from"../components/Card";

function fmt(v){return(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2})}
function fmtData(s){if(!s)return"";const[y,m,d]=s.split("-");return`${d}/${m}/${y}`}
const HOJE=new Date().toISOString().slice(0,10);

export default function Dashboard({user}){
  const[dados,setDados]=useState(null);

  useEffect(()=>{(async()=>{
    const[pontos,contratos,pagamentos]=await Promise.all([getPontos(user.email),getContratos(user.email),getPagamentos(user.email)]);
    const ativos=contratos.filter(c=>c.status==="ativo");
    const ocupados=new Set(ativos.map(c=>c.pontoId)).size;
    const receitaMensal=ativos.reduce((s,c)=>s+(c.valorMensal||0),0);
    const aReceber=pagamentos.filter(p=>p.status==="pendente").reduce((s,p)=>s+(p.valor||0),0);
    const vencendo=contratos.filter(c=>{
      if(c.status!=="ativo"||!c.dataFim)return false;
      const dias=Math.floor((new Date(c.dataFim+"T12:00")-new Date())/(1000*60*60*24));
      return dias>=0&&dias<=30;
    }).sort((a,b)=>{
      const da=Math.floor((new Date(a.dataFim+"T12:00")-new Date())/(1000*60*60*24));
      const db=Math.floor((new Date(b.dataFim+"T12:00")-new Date())/(1000*60*60*24));
      return da-db;
    });
    const vencidos=contratos.filter(c=>{
      if(!c.dataFim)return false;
      return c.status==="ativo"&&c.dataFim<HOJE;
    });
    setDados({pontos,contratos,ocupados,receitaMensal,aReceber,vencendo,vencidos,total:pontos.length});
  })()},[user.email]);

  if(!dados)return(<div style={{padding:"40px 0",textAlign:"center",color:"#475569"}}>Carregando...</div>);

  const taxaOcupacao=dados.total>0?Math.round((dados.ocupados/dados.total)*100):0;

  return(<div style={{padding:"0 4px"}}>
    <h2 style={{color:"#f1f5f9",margin:"0 0 16px",fontSize:20,fontWeight:700}}>Dashboard</h2>

    {/* Alertas críticos */}
    {dados.vencidos.length>0&&<div style={{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:16,padding:"14px 16px",marginBottom:12}}>
      <div style={{color:"#ef4444",fontWeight:700,fontSize:13,marginBottom:6}}>⚠️ {dados.vencidos.length} contrato(s) vencido(s)!</div>
      {dados.vencidos.map(c=><div key={c.id} style={{color:"#fca5a5",fontSize:12}}>• {c.anunciante} — venceu {fmtData(c.dataFim)}</div>)}
    </div>}

    {dados.vencendo.length>0&&<div style={{background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.25)",borderRadius:16,padding:"14px 16px",marginBottom:12}}>
      <div style={{color:"#f59e0b",fontWeight:700,fontSize:13,marginBottom:6}}>🔔 {dados.vencendo.length} contrato(s) vencendo em até 30 dias</div>
      {dados.vencendo.slice(0,3).map(c=>{
        const dias=Math.floor((new Date(c.dataFim+"T12:00")-new Date())/(1000*60*60*24));
        return(<div key={c.id} style={{color:"#fde68a",fontSize:12}}>• {c.anunciante} — {dias===0?"hoje":dias+" dias"} ({fmtData(c.dataFim)})</div>);
      })}
    </div>}

    {/* Métricas */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
      {[
        ["Pontos cadastrados","🖼️","#0ea5e9",dados.total,"total"],
        ["Ocupados agora","📍","#22c55e",dados.ocupados,"pontos"],
        ["Receita mensal","💰","#f59e0b","R$ "+fmt(dados.receitaMensal),""],
        ["A receber","⏳","#f97316","R$ "+fmt(dados.aReceber),"pendente"],
      ].map(([l,ic,cor,val,sub])=><div key={l} style={{background:"#0f1623",borderRadius:16,padding:"14px",border:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{fontSize:20,marginBottom:6}}>{ic}</div>
        <div style={{color:cor,fontSize:18,fontWeight:800}}>{val}</div>
        {sub&&<div style={{color:"#64748b",fontSize:10}}>{sub}</div>}
        <div style={{color:"#475569",fontSize:11,marginTop:2}}>{l}</div>
      </div>)}
    </div>

    {/* Taxa de ocupação */}
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{color:"#94a3b8",fontSize:13,fontWeight:600}}>Taxa de ocupação</span>
        <span style={{color:taxaOcupacao>=80?"#22c55e":taxaOcupacao>=50?"#f59e0b":"#ef4444",fontWeight:800,fontSize:18}}>{taxaOcupacao}%</span>
      </div>
      <div style={{background:"rgba(255,255,255,0.06)",borderRadius:8,height:10,overflow:"hidden"}}>
        <div style={{background:taxaOcupacao>=80?"#22c55e":taxaOcupacao>=50?"#f59e0b":"#0ea5e9",height:"100%",width:taxaOcupacao+"%",borderRadius:8,transition:"width .5s"}}/>
      </div>
      <div style={{color:"#475569",fontSize:11,marginTop:6}}>{dados.ocupados} de {dados.total} pontos ocupados</div>
    </Card>

    {/* Últimos contratos ativos */}
    {dados.contratos.filter(c=>c.status==="ativo").slice(0,3).map(c=>{
      const dias=c.dataFim?Math.floor((new Date(c.dataFim+"T12:00")-new Date())/(1000*60*60*24)):null;
      return(<Card key={c.id}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{color:"#f1f5f9",fontWeight:600,fontSize:14}}>{c.anunciante}</div>
            <div style={{color:"#64748b",fontSize:12,marginTop:2}}>R$ {fmt(c.valorMensal)}/mês · até {fmtData(c.dataFim)}</div>
          </div>
          {dias!==null&&<div style={{background:dias<7?"rgba(239,68,68,.1)":dias<30?"rgba(245,158,11,.1)":"rgba(14,165,233,.1)",borderRadius:10,padding:"6px 10px",textAlign:"center"}}>
            <div style={{color:dias<7?"#ef4444":dias<30?"#f59e0b":"#38bdf8",fontSize:16,fontWeight:800}}>{dias<0?"✓":dias}</div>
            <div style={{color:"#64748b",fontSize:9}}>{dias<0?"venceu":"dias"}</div>
          </div>}
        </div>
      </Card>);
    })}
  </div>);
}
