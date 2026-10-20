import test from "node:test";
import assert from "node:assert/strict";
import { Runner } from "../engine/js/runner.js";
import { Renderer } from "../engine/js/renderer.js";
import { createGameState } from "../engine/js/state.js";
import { SaveManager } from "../engine/js/save.js";
import { exportTransfer, importTransfer } from "../engine/js/transfer.js";
import { prepareResumeState, resolveResumeIndex } from "../engine/js/resume.js";

const c=(type,action,args={})=>({type,action,args});
const commands=[
  c("chapter","start",{id:"C1",reset:true}),
  c("scene","start",{id:"S1"}),
  c("bg","show",{id:"BG_NEW",effect:"dust_weak",effect_layer:"foreground"}),
  c("char","show",{id:"A",expression:"normal"}),
  c("bgm","play",{file:"B_NEW.dat"}),
  c("text","show",{id:"T1",speaker:"A"}),
  c("scene","end",{id:"S1"})
];
const config={workId:"w",saveKey:"w.v1",engineVersion:"1.0"};
function storage() {
  const map=new Map();
  return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
}

test("default position is resolved once for display, save, load and transfer",async()=>{
  for(const position of ["left","center","right"]) {
    const state=createGameState();
    let displayed;
    new Runner(commands,state,{character:command=>displayed=command.args.position},{defaultCharacterPosition:position}).start();
    assert.equal(displayed,position);
    assert.equal(state.visibleCharacters[position].id,"A");
    assert.equal(state.visibleCharacters.undefined,undefined);
    const saves=new SaveManager(storage(),config);
    saves.save("one",state);
    const loaded=saves.load("one");
    const prepared=prepareResumeState(commands,loaded,loaded.state,position);
    assert.equal(prepared.index,5);
    assert.deepEqual(prepared.state.visibleCharacters,state.visibleCharacters);
    const imported=await importTransfer(config,await exportTransfer(config,state));
    assert.deepEqual(prepareResumeState(commands,imported,imported.state,position).state.visibleCharacters,state.visibleCharacters);
    const renderer=Object.create(Renderer.prototype);
    let restoredPosition;
    Object.assign(renderer,{resetPresentation(){},startGame(){},showBackground(){},
      showCharacter(command){restoredPosition=command.args.position;},comparison:{}});
    renderer.restore(prepared.state,{});
    assert.equal(restoredPosition,position);
  }
});

test("explicit position overrides the default without changing the command",()=>{
  const command=c("char","show",{id:"A",expression:"normal",position:"left"});
  const state=createGameState();
  new Runner([command],state,{}, {defaultCharacterPosition:"center"}).start();
  assert.deepEqual(Object.keys(state.visibleCharacters),["left"]);
  assert.equal(command.args.position,"left");
});

test("default without configuration stays right",()=>{
  const state=createGameState();
  new Runner([commands[3]],state).start();
  assert.equal(state.visibleCharacters.right.id,"A");
  assert.equal(commands[3].args.position,undefined);
});

test("inserted and removed commands do not move the saved text",()=>{
  const state=createGameState();
  new Runner(commands,state).start();
  const edited=[...commands.slice(0,2),c("wait","start",{duration_ms:20}),...commands.slice(2)];
  assert.equal(resolveResumeIndex(edited,{resumeCommandIndex:5},state),6);
  assert.equal(prepareResumeState(edited,{},state).index,6);
  assert.equal(resolveResumeIndex(commands.filter(x=>x.type!=="bgm"),{},state),4);
});

test("legacy text ID migrates stale presentation and undefined slot without changing progress flags",()=>{
  const legacy={...createGameState(),currentSceneId:"S1",currentTextId:"T1",currentCommandIndex:3,
    visibleCharacters:{undefined:{id:"OLD",expression:"retired"}},currentBackground:"RETIRED",
    currentBgm:"B_OLD.dat",flags:{solved:true},unlockedMemoIds:["memo"],trail:["S1"]};
  const result=prepareResumeState(commands,{resumeCommandIndex:3},legacy,"center");
  assert.equal(result.index,5);
  assert.equal(result.state.currentBackground,"BG_NEW");
  assert.equal(result.state.currentBackgroundEffectLayer,"foreground");
  assert.equal(result.state.currentBgm,"B_NEW.dat");
  assert.deepEqual(result.state.visibleCharacters,{center:{id:"A",expression:"normal",crop:"bust"}});
  assert.deepEqual(result.state.flags,{solved:true});
  assert.deepEqual(result.state.unlockedMemoIds,["memo"]);
  assert.equal(legacy.currentBackground,"RETIRED");
});

test("legacy schema-1 save and transfer can be loaded after reconversion",async()=>{
  const state={...createGameState(),currentSceneId:"S1",currentTextId:"T1",currentCommandIndex:2,trail:["S1"]};
  const store=storage();
  store.setItem("w.v1.save.old",JSON.stringify({schemaVersion:1,workId:"w",engineVersion:"1.0",resumeCommandIndex:2,state}));
  const data=new SaveManager(store,config).load("old");
  assert.equal(prepareResumeState(commands,data,data.state).index,5);
  const transfer=await importTransfer(config,await exportTransfer(config,state));
  assert.equal(prepareResumeState(commands,transfer,transfer.state).index,5);
});

test("removed text falls back to the stable scene instead of an unrelated command",()=>{
  const state={currentResumePoint:{type:"text",id:"DELETED"},currentTextId:"DELETED",currentSceneId:"S1"};
  assert.equal(resolveResumeIndex(commands,{resumeCommandIndex:5},state),1);
});

test("legacy scene autosave ignores a text ID from another scene",()=>{
  const extended=[...commands,c("scene","start",{id:"S2"}),c("text","show",{id:"T2"})];
  assert.equal(resolveResumeIndex(extended,{}, {currentSceneId:"S2",currentTextId:"T1"}),7);
});

test("branch migration replays only visited scenes and does not execute flag assignments",()=>{
  const branched=[
    c("chapter","start",{id:"C",reset:true}),c("scene","start",{id:"START"}),
    c("bg","show",{id:"BASE"}),c("scene","end",{id:"START"}),
    c("scene","start",{id:"UNVISITED"}),c("bg","show",{id:"WRONG"}),c("scene","end",{id:"UNVISITED"}),
    c("scene","start",{id:"TARGET"}),c("flag","set",{id:"solved",value:false}),
    c("text","show",{id:"TARGET_TEXT"}),c("scene","end",{id:"TARGET"})
  ];
  const saved={trail:["START","TARGET"],currentSceneId:"TARGET",currentTextId:"TARGET_TEXT",flags:{solved:true}};
  const result=prepareResumeState(branched,{},saved);
  assert.equal(result.state.currentBackground,"BASE");
  assert.equal(result.state.flags.solved,true);
});

test("choice resume uses stable choice ID",()=>{
  assert.equal(resolveResumeIndex([c("scene","start",{id:"S"}),c("choice","start",{id:"Q"})],{},
    {currentChoiceId:"Q",currentSceneId:"S"}),1);
});
