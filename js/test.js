const { Graph } = require("./graph");
const { findShortestPath } = require("./dijkstra");

function assertEqual(actual, expected, name) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? `✅ ${name}` : `❌ ${name}\n   expected: ${JSON.stringify(expected)}\n   actual:   ${JSON.stringify(actual)}`);
}

const g = new Graph();
g.addEdge("A", "B", 4);
g.addEdge("A", "C", 2);
g.addEdge("C", "B", 1);
g.addEdge("B", "D", 5);
g.addEdge("C", "D", 8);

// 1. Đường bình thường
assertEqual(findShortestPath(g, "A", "D"), { path: ["A", "C", "B", "D"], totalCost: 8 }, "Đường ngắn nhất bình thường");

// 2. Chặn C-B (kẹt xe) -> phải đi vòng
g.updateRoadCondition("C", "B", true);
assertEqual(findShortestPath(g, "A", "D"), { path: ["A", "B", "D"], totalCost: 9 }, "Né đường kẹt xe C-B");

// 3. Chặn thêm B-D và C-D -> không còn đường tới D
g.updateRoadCondition("B", "D", true);
g.updateRoadCondition("C", "D", true);
assertEqual(findShortestPath(g, "A", "D"), { path: [], totalCost: -1 }, "Tất cả đường bị chặn");

// 4. Gỡ chặn -> có đường lại
g.updateRoadCondition("C", "B", false);
g.updateRoadCondition("B", "D", false);
assertEqual(findShortestPath(g, "A", "D").totalCost, 8, "Hết kẹt xe thì đi lại được");

// 5. Trường hợp biên
assertEqual(findShortestPath(g, "A", "A"), { path: ["A"], totalCost: 0 }, "Điểm đầu = điểm cuối");
assertEqual(findShortestPath(g, "A", "Z"), { path: [], totalCost: -1 }, "Điểm không tồn tại");

// 6. Node dạng số
const g2 = new Graph();
g2.addEdge(1, 2, 3);
g2.addEdge(2, 3, 4);
assertEqual(findShortestPath(g2, 1, 3), { path: ["1", "2", 3], totalCost: 7 }, "Node dạng số");