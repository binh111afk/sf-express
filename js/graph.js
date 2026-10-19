class Graph{
  constructor() {
    this.adjacencyList = {}; // Danh sách kề chứa các cạnh của đồ thị
  }

  // Thêm một địa điểm (nút) vào bản đồ
  addNode(node) {
    if (!this.adjacencyList[node]) {
      this.adjacencyList[node] = [];
    }
  }

  // Thêm con đường nối giữa 2 điểm u và v
  // distance: khoảng cách thực tế (km hoặc mét)
  // isBlocked: true nếu ngập lụt / cấm đi
  // trafficFactor: hệ số kẹt xe (1.0 = bình thường, 3.0 = kẹt nặng)
  addEdge(u, v, distance, isBlocked = false, trafficFactor = 1.0) {
    this.addNode(u);
    this.addNode(v);

    // Vì đường giao thông đi lại 2 chiều, nên ta push vào cả 2 phía
    this.adjacencyList[u].push({ to: v, distance, isBlocked, trafficFactor });
    this.adjacencyList[v].push({ to: u, distance, isBlocked, trafficFactor });
  }

  // Hàm cập nhật trạng thái khi có sự cố (Kẹt xe hoặc Ngập lụt)
  updateRoadCondition(u, v, isBlocked, trafficFactor) {
    // Cập nhật chiều u -> v
    const edge1 = this.adjacencyList[u]?.find(e => e.to === v);
    if (edge1) {
      edge1.isBlocked = isBlocked;
      edge1.trafficFactor = trafficFactor;
    }

    // Cập nhật chiều v -> u
    const edge2 = this.adjacencyList[v]?.find(e => e.to === u);
    if (edge2) {
      edge2.isBlocked = isBlocked;
      edge2.trafficFactor = trafficFactor;
    }
  }
}