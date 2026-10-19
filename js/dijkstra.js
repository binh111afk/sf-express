function findShortestPath(graph, startNode, endNode) {
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
    // Tìm node chưa thăm có khoảng cách tạm tính ngắn nhất
    let currentNode = null;
    let shortestDist = Infinity;

    for (let node of unvisitedNodes) {
      if (distances[node] < shortestDist) {
        shortestDist = distances[node];
        currentNode = node;
      }
    }

    // Nếu không còn đường đi hoặc đã tới đích
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
      // 🚨 BỎ QUA nếu đoạn đường bị ngập lụt hoàn toàn
      if (edge.isBlocked) continue;

      // Trọng số hiệu chỉnh = Khoảng cách * Hệ số kẹt xe
      const effectiveWeight = edge.distance * edge.trafficFactor;
      const calculatedDist = distances[currentNode] + effectiveWeight;

      // Nếu tìm được đường đi ngắn hơn thì cập nhật
      if (calculatedDist < distances[edge.to]) {
        distances[edge.to] = calculatedDist;
        previous[edge.to] = currentNode;
      }
    }
  }

  // 3. Truy vết lại lộ trình từ điểm cuối về điểm đầu
  const path = [];
  let curr = endNode;
  while (curr !== null) {
    path.unshift(curr);
    curr = previous[curr];
  }

  const isReachable = distances[endNode] !== Infinity && path.length > 1;

  return {
    path: isReachable ? path : [],         // Mảng chứa các điểm đi qua (VD: ["Kho", "A", "C"])
    totalCost: isReachable ? distances[endNode] : -1 // Tổng chi phí / thời gian
  };
}
