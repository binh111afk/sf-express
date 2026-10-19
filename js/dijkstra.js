/**
 * dijkstra.js - Tìm đường đi ngắn nhất bằng thuật toán Dijkstra.
 * Đường bị kẹt xe hoặc ngập lụt (isBlocked = true) bị bỏ qua hoàn toàn.
 *
 * Trả về:
 *   { path: [...các điểm đi qua], totalCost: tổng quãng đường }
 *   Không có đường đi: { path: [], totalCost: -1 }
 */
function findShortestPath(graph, startNode, endNode) {
  // Điểm đầu hoặc điểm cuối không có trong bản đồ
  if (!(startNode in graph.adjacencyList) || !(endNode in graph.adjacencyList)) {
    return { path: [], totalCost: -1 };
  }

  // Điểm đầu trùng điểm cuối
  if (startNode === endNode) {
    return { path: [startNode], totalCost: 0 };
  }

  const distances = {};
  const previous = {};
  const unvisitedNodes = new Set();

  // 1. Khởi tạo khoảng cách ban đầu là vô cực
  for (let node in graph.adjacencyList) {
    distances[node] = Infinity;
    previous[node] = null;
    unvisitedNodes.add(node);
  }

  distances[startNode] = 0;

  while (unvisitedNodes.size > 0) {
    // Tìm điểm chưa thăm có khoảng cách tạm tính ngắn nhất
    let currentNode = null;
    let shortestDist = Infinity;

    for (let node of unvisitedNodes) {
      if (distances[node] < shortestDist) {
        shortestDist = distances[node];
        currentNode = node;
      }
    }

    // Không còn điểm nào đi tới được, hoặc đã tới đích
    if (currentNode === null || distances[currentNode] === Infinity) {
      break;
    }

    if (currentNode === endNode) {
      break;
    }

    unvisitedNodes.delete(currentNode);

    // 2. Duyệt qua các điểm liền kề
    const neighbors = graph.adjacencyList[currentNode] || [];
    for (let edge of neighbors) {
      // Bỏ qua đoạn đường bị kẹt xe hoặc ngập lụt
      if (edge.isBlocked) continue;

      const calculatedDist = distances[currentNode] + edge.distance;

      // Tìm được đường ngắn hơn thì cập nhật
      if (calculatedDist < distances[edge.to]) {
        distances[edge.to] = calculatedDist;
        previous[edge.to] = currentNode;
      }
    }
  }

  // 3. Truy vết lộ trình từ điểm cuối về điểm đầu
  if (distances[endNode] === Infinity) {
    return { path: [], totalCost: -1 };
  }

  const path = [];
  let curr = endNode;
  while (curr !== null) {
    path.unshift(curr);
    curr = previous[curr];
  }

  return {
    path: path,
    totalCost: distances[endNode],
  };
}

// Cho phép chạy thử bằng Node.js (không ảnh hưởng khi chạy trên web)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { findShortestPath };
}