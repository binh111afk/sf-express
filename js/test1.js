const Graph=require('./dothi.js');
const dijkstra=require('./thuattoan.js');

let g=new Graph(4);

g.addCanh(0,1,4);
g.addCanh(0,2,2);
g.addCanh(1,2,3);
g.addCanh(1,3,3);
g.addCanh(2,3,8);

console.log("Giao thong binh thuong:");
g.xuatGraph();
dijkstra(g,0);

let ngaplut="Ngap lut";
let dinh_u=1;
let dinh_v=3;
g.deleteCanh(dinh_u,dinh_v);
g.xuatGraph();
dijkstra(g,0);
