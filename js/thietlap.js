"use strict";

/**
 * ThietLap — bộ điều khiển vùng thiết lập (.o2).
 *
 * Nhiệm vụ:
 * - Bật/tắt chế độ tạo điểm, hủy điểm, đánh dấu giờ cao điểm và ngập lụt.
 * - Gọi các hàm có sẵn của map.js (window.BanDo) để thay đổi bản đồ.
 * - Gọi Thuattoan.timLoTrinh() khi bấm «Tìm lộ trình».
 *
 * Lưu ý: map.js chỉ xử lý cú bấm để hiện/chọn điểm. Các chế độ hủy điểm
 * và đánh dấu đoạn đường được xử lý ở đây, không sửa map.js.
 */
(function () {

    const o1 = document.getElementById("banDo");
    const o2 = document.querySelector(".o2");

    if (!o1 || !o2) {
        return;
    }

    if (!window.BanDo) {
        o2.textContent = "Cần nạp js/map.js trước js/thietlap.js.";
        return;
    }

    const BanDo = window.BanDo;

    /* Các chế độ bấm trên bản đồ. */
    const CHE_DO = {
        KHONG: "khong",
        TAO_DIEM: "taoDiem",
        HUY_DIEM: "huyDiem",
        CAO_DIEM: "caoDiem",
        NGAP: "ngap"
    };

    const CHE_DO_MAC_DINH = CHE_DO.TAO_DIEM;
    const SVG_NS = "http://www.w3.org/2000/svg";
    const BAN_KINH_CHON_DIEM = 24;
    const BAN_KINH_CHON_CANH = 18;
    const HANH_VI_CHUOT = 6;

    let cheDo = CHE_DO_MAC_DINH;

    /**
     * Loại sự cố của từng đoạn đường.
     * map.js chỉ lưu "chan" hoặc "ngap"; ở đây lưu chi tiết hơn để vẽ
     * màu cam (giờ cao điểm) và màu đỏ (ngập lụt).
     * Key: mã cạnh, Value: CHE_DO.CAO_DIEM hoặc CHE_DO.NGAP.
     */
    const loaiSuCo = new Map();

    let lanBam = null;
    let dangHuyKeo = false;

    /* ---------- phần tử giao diện ---------- */
    const nutTaoDiem = document.getElementById("nutTaoDiem");
    const nutHuyDiem = document.getElementById("nutHuyDiem");
    const nutCaoDiem = document.getElementById("nutCaoDiem");
    const nutNgap = document.getElementById("nutNgap");
    const nutTimDuong = document.getElementById("nutTimDuong");
    const nutDatLai = document.getElementById("nutDatLai");
    const oThongBao = document.getElementById("thongBao");
    const oSoLieu = document.getElementById("soLieuThietLap");

    /* =========================================================
       1. TIỆN ÍCH
       ========================================================= */

    function laySvg() {
        return document.querySelector("#mapZoom svg");
    }

    function layDuLieu() {
        return BanDo.layDuLieu();
    }

    function layZoom() {
        return Math.max(1, BanDo.layMucZoom());
    }

    function doiSangToaDoSVG(clientX, clientY) {
        const svg = laySvg();
        const diem = svg.createSVGPoint();
        diem.x = clientX;
        diem.y = clientY;
        return diem.matrixTransform(svg.getScreenCTM().inverse());
    }

    function thongBao(chu, loai) {
        if (!oThongBao) {
            return;
        }

        oThongBao.textContent = chu;
        oThongBao.classList.remove("loi", "ok");

        if (loai) {
            oThongBao.classList.add(loai);
        }
    }

    function laDiemDangHien(id) {
        return BanDo.layDanhSachDiemHien().indexOf(id) !== -1;
    }

    /* Khoảng cách từ điểm p tới đoạn thẳng a–b. */
    function khoangCachToiDoanThang(p, a, b) {
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const apx = p.x - a.x;
        const apy = p.y - a.y;
        const binhPhuongDoDai = abx * abx + aby * aby;

        if (binhPhuongDoDai === 0) {
            return Math.hypot(apx, apy);
        }

        /* t là vị trí hình chiếu trên đoạn, kẹp trong [0, 1]. */
        let t = (apx * abx + apy * aby) / binhPhuongDoDai;
        t = Math.max(0, Math.min(1, t));

        const x = a.x + t * abx;
        const y = a.y + t * aby;

        return Math.hypot(p.x - x, p.y - y);
    }

    function timNutGanNhat(toaDo, chiLayDiemDangHien) {
        const duLieu = layDuLieu();
        const banKinh = BAN_KINH_CHON_DIEM / layZoom();
        let ganNhat = null;
        let nhoNhat = banKinh;

        duLieu.nodes.forEach(function (nut) {
            if (chiLayDiemDangHien && !laDiemDangHien(nut.id)) {
                return;
            }

            const khoangCach = Math.hypot(nut.x - toaDo.x, nut.y - toaDo.y);

            if (khoangCach < nhoNhat) {
                nhoNhat = khoangCach;
                ganNhat = nut;
            }
        });

        return ganNhat;
    }

    function timCanhGanNhat(toaDo) {
        const duLieu = layDuLieu();
        const banKinh = BAN_KINH_CHON_CANH / layZoom();

        const nutTheoId = new Map();
        duLieu.nodes.forEach(function (nut) {
            nutTheoId.set(nut.id, nut);
        });

        let ganNhat = null;
        let nhoNhat = banKinh;

        duLieu.edges.forEach(function (canh) {
            const a = nutTheoId.get(canh.a);
            const b = nutTheoId.get(canh.b);

            if (!a || !b) {
                return;
            }

            const khoangCach = khoangCachToiDoanThang(toaDo, a, b);

            if (khoangCach < nhoNhat) {
                nhoNhat = khoangCach;
                ganNhat = canh;
            }
        });

        return ganNhat;
    }

    /* =========================================================
       2. ĐỔI CHẾ ĐỘ VÀ CẬP NHẬT GIAO DIỆN
       ========================================================= */

    function datCheDoMoi(cheDoMoi) {
        /* Bấm lại đúng nút đang bật thì tắt chế độ. */
        cheDo = (cheDo === cheDoMoi) ? CHE_DO.KHONG : cheDoMoi;

        /* Gọi API của map.js cho đúng tên chế độ nó hiểu. */
        if (cheDo === CHE_DO.NGAP) {
            BanDo.datCheDo("ngap");
        } else if (cheDo === CHE_DO.CAO_DIEM) {
            BanDo.datCheDo("chan");
        } else {
            BanDo.datCheDo("chonDiem");
        }

        capNhatGiaoDien();
        thongBaoTheoCheDo();
    }

    function thongBaoTheoCheDo() {
        if (cheDo === CHE_DO.TAO_DIEM) {
            thongBao("Đang bật tạo điểm. Bấm lần 1 để hiện điểm, bấm lần 2 để chọn điểm giao hàng.");
        } else if (cheDo === CHE_DO.HUY_DIEM) {
            thongBao("Đang bật hủy điểm. Bấm vào một điểm đã tạo để ẩn điểm đó.");
        } else if (cheDo === CHE_DO.CAO_DIEM) {
            thongBao("Đang bật giờ cao điểm. Bấm vào đoạn đường để đánh dấu; bấm lại để bỏ.");
        } else if (cheDo === CHE_DO.NGAP) {
            thongBao("Đang bật ngập lụt. Bấm vào đoạn đường để đánh dấu; bấm lại để bỏ.");
        } else {
            thongBao("Đã tắt chế độ. Bật một nút ở trên rồi thao tác trên bản đồ.");
        }
    }

    function capNhatGiaoDien() {
        const cacNut = [
            [nutTaoDiem, CHE_DO.TAO_DIEM],
            [nutHuyDiem, CHE_DO.HUY_DIEM],
            [nutCaoDiem, CHE_DO.CAO_DIEM],
            [nutNgap, CHE_DO.NGAP]
        ];

        cacNut.forEach(function (cap) {
            const nut = cap[0];
            const ma = cap[1];

            if (!nut) {
                return;
            }

            const dangBat = cheDo === ma;
            nut.classList.toggle("dang-bat", dangBat);
            nut.setAttribute("aria-pressed", dangBat ? "true" : "false");
        });

        /* Khi không ở chế độ tạo điểm: ẩn dấu + khi rê chuột. */
        document.body.classList.toggle("khong-tao-diem", cheDo !== CHE_DO.TAO_DIEM);
        document.body.classList.toggle("che-do-canh", cheDo === CHE_DO.CAO_DIEM || cheDo === CHE_DO.NGAP);
        document.body.classList.toggle("che-do-xoa", cheDo === CHE_DO.HUY_DIEM);

        capNhatSoLieu();
    }

    function capNhatSoLieu() {
        const daChon = BanDo.layDanhSachDiemChon();
        let soCaoDiem = 0;
        let soNgap = 0;

        loaiSuCo.forEach(function (loai) {
            if (loai === CHE_DO.CAO_DIEM) {
                soCaoDiem++;
            } else {
                soNgap++;
            }
        });

        if (oSoLieu) {
            oSoLieu.textContent = "Đã chọn " + daChon.length + " điểm giao hàng · " +
                soCaoDiem + " đoạn cao điểm · " + soNgap + " đoạn ngập.";
        }
    }

    /* =========================================================
       3. XỬ LÝ CÚ BẤM TRÊN BẢN ĐỒ
       ========================================================= */

    function batDauTheoDoi(e) {
        if (!o1.contains(e.target) || e.target.closest(".dieukhien")) {
            lanBam = null;
            return;
        }

        if (e.pointerType === "mouse" && e.button !== 0) {
            lanBam = null;
            return;
        }

        lanBam = {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY
        };
    }

    function ketThucTheoDoi(e) {
        if (dangHuyKeo || !lanBam || e.pointerId !== lanBam.id) {
            return;
        }

        const daDiChuyen = Math.abs(e.clientX - lanBam.x) + Math.abs(e.clientY - lanBam.y);
        const laCuBam = daDiChuyen < HANH_VI_CHUOT;
        const ketThucTrongBanDo = o1.contains(e.target) && !e.target.closest(".dieukhien");

        lanBam = null;

        if (!ketThucTrongBanDo || !laCuBam) {
            return;
        }

        /* Chế độ tạo điểm: để map.js tự xử lý như bản gốc. */
        if (cheDo === CHE_DO.TAO_DIEM) {
            /* Chờ map.js chạy xong rồi mới cập nhật số liệu. */
            setTimeout(capNhatSauThayDoi, 0);
            return;
        }

        /*
         * Các chế độ khác: chặn map.js xử lý cú bấm này.
         * map.js đã bắt đầu một lượt kéo ở pointerdown, nên phát pointercancel
         * để nó dọn trạng thái kéo, tránh bản đồ bị kẹt ở trạng thái đang kéo.
         */
        e.stopPropagation();

        dangHuyKeo = true;
        window.dispatchEvent(new PointerEvent("pointercancel", {
            pointerId: e.pointerId,
            bubbles: true
        }));
        dangHuyKeo = false;

        const svg = laySvg();

        if (!svg) {
            return;
        }

        const toaDo = doiSangToaDoSVG(e.clientX, e.clientY);

        if (cheDo === CHE_DO.HUY_DIEM) {
            xuLyHuyDiem(toaDo);
        } else if (cheDo === CHE_DO.CAO_DIEM || cheDo === CHE_DO.NGAP) {
            xuLyDanhDauCanh(toaDo, cheDo);
        } else {
            thongBao("Chưa bật chế độ nào. Bật một nút ở vùng thiết lập trước.");
        }
    }

    function xuLyHuyDiem(toaDo) {
        const nut = timNutGanNhat(toaDo, true);

        if (!nut) {
            thongBao("Không có điểm đã tạo nào gần đây. Bấm sát vào điểm cần hủy.");
            return;
        }

        const kho = layDuLieu().nodes.find(function (item) {
            return item.type === "kho";
        });

        if (kho && nut.id === kho.id) {
            thongBao("Không thể ẩn Kho.");
            return;
        }

        BanDo.anDiem(nut.id);
        thongBao("Đã ẩn điểm " + nut.id + ".");
        capNhatSauThayDoi();
    }

    function xuLyDanhDauCanh(toaDo, loai) {
        const canh = timCanhGanNhat(toaDo);

        if (!canh) {
            thongBao("Không có đoạn đường nào gần đây. Bấm sát vào đoạn đường cần đánh dấu.");
            return;
        }

        const loaiCu = loaiSuCo.get(canh.id);
        const tenLoai = loai === CHE_DO.NGAP ? "ngập lụt" : "giờ cao điểm";

        if (loaiCu === loai) {
            BanDo.xoaTrangThaiCanh(canh.id);
            loaiSuCo.delete(canh.id);
            thongBao("Đã bỏ đánh dấu " + tenLoai + " cho đoạn " + canh.id + ".");
        } else {
            /*
             * map.js chỉ nhận "chan" hoặc "ngap".
             * Giờ cao điểm dùng "chan" vì thuật toán cũng phải tránh đoạn đó.
             */
            BanDo.datTrangThaiCanh(canh.id, loai === CHE_DO.NGAP ? "ngap" : "chan");
            loaiSuCo.set(canh.id, loai);
            thongBao("Đã đánh dấu " + tenLoai + " cho đoạn " + canh.id + ".");
        }

        veLaiSuCo();
        capNhatSauThayDoi();
    }

    /* =========================================================
       4. VẼ DẤU SỰ CỐ LÊN BẢN ĐỒ
       ========================================================= */

    function veLaiSuCo() {
        const svg = laySvg();

        if (!svg) {
            return;
        }

        let nhom = svg.querySelector("#lopSuCo");

        if (!nhom) {
            nhom = document.createElementNS(SVG_NS, "g");
            nhom.setAttribute("id", "lopSuCo");
            nhom.setAttribute("pointer-events", "none");
            svg.appendChild(nhom);
        }

        nhom.replaceChildren();

        const duLieu = layDuLieu();
        const nutTheoId = new Map();
        const canhTheoId = new Map();

        duLieu.nodes.forEach(function (nut) {
            nutTheoId.set(nut.id, nut);
        });

        duLieu.edges.forEach(function (canh) {
            canhTheoId.set(canh.id, canh);
        });

        loaiSuCo.forEach(function (loai, idCanh) {
            const canh = canhTheoId.get(idCanh);

            if (!canh) {
                return;
            }

            const a = nutTheoId.get(canh.a);
            const b = nutTheoId.get(canh.b);

            if (!a || !b) {
                return;
            }

            const duong = document.createElementNS(SVG_NS, "line");
            duong.setAttribute("x1", a.x);
            duong.setAttribute("y1", a.y);
            duong.setAttribute("x2", b.x);
            duong.setAttribute("y2", b.y);
            duong.setAttribute("class", "canh-su-co " +
                (loai === CHE_DO.NGAP ? "canh-ngap" : "canh-cao-diem"));

            nhom.appendChild(duong);
        });

        /* Đưa lớp sự cố lên trên tuyến đường vừa vẽ. */
        svg.appendChild(nhom);
    }

    /* =========================================================
       5. TÌM LỘ TRÌNH VÀ ĐẶT LẠI
       ========================================================= */

    function capNhatSauThayDoi() {
        capNhatSoLieu();

        if (window.KetQua && typeof window.KetQua.xoa === "function") {
            window.KetQua.xoa();
        }

        window.dispatchEvent(new CustomEvent("ban-do-thay-doi"));
    }

    function timDuong() {
        if (!window.Thuattoan) {
            thongBao("Chưa nạp js/thuattoan.js.", "loi");
            return;
        }

        const diemNhan = BanDo.layDanhSachDiemChon();

        if (diemNhan.length === 0) {
            thongBao("Hãy tạo và chọn ít nhất một điểm giao hàng.", "loi");

            if (window.KetQua) {
                window.KetQua.hienLoi("Chưa chọn điểm giao hàng nào.");
            }

            return;
        }

        const duLieu = layDuLieu();
        const kho = duLieu.nodes.find(function (nut) {
            return nut.type === "kho";
        });

        if (!kho) {
            thongBao("Dữ liệu bản đồ không có Kho.", "loi");
            return;
        }

        /* Các đoạn bị đánh dấu sẽ không được đưa vào đồ thị. */
        const canhBiChan = new Set(BanDo.layTrangThaiCanh().keys());

        const ketQua = window.Thuattoan.timLoTrinh(duLieu, kho.id, diemNhan, {
            canhBiChan: canhBiChan
        });

        if (window.KetQua) {
            window.KetQua.hienTuyen(ketQua);
        }

        veLaiSuCo();

        if (ketQua.ok) {
            thongBao("Đã tính lộ trình qua " + ketQua.khuc.length + " chặng.", "ok");
        } else {
            thongBao(ketQua.loi, "loi");
        }
    }

    function datLai() {
        /* Ẩn toàn bộ điểm đã tạo (anDiem cũng bỏ điểm khỏi danh sách chọn). */
        BanDo.layDanhSachDiemHien().forEach(function (id) {
            BanDo.anDiem(id);
        });

        /* Xóa toàn bộ đánh dấu đoạn đường. */
        loaiSuCo.forEach(function (loai, idCanh) {
            BanDo.xoaTrangThaiCanh(idCanh);
        });
        loaiSuCo.clear();

        BanDo.xoaDuongDi();

        if (window.KetQua) {
            window.KetQua.xoa();
        }

        cheDo = CHE_DO_MAC_DINH;
        BanDo.datCheDo("chonDiem");
        BanDo.dungVaoKho();

        veLaiSuCo();
        capNhatGiaoDien();
        thongBaoTheoCheDo();
        window.dispatchEvent(new CustomEvent("ban-do-thay-doi"));
    }

    /* =========================================================
       6. GẮN SỰ KIỆN VÀ KHỞI ĐỘNG
       ========================================================= */

    function ganSuKien() {
        if (nutTaoDiem) {
            nutTaoDiem.addEventListener("click", function () {
                datCheDoMoi(CHE_DO.TAO_DIEM);
            });
        }

        if (nutHuyDiem) {
            nutHuyDiem.addEventListener("click", function () {
                datCheDoMoi(CHE_DO.HUY_DIEM);
            });
        }

        if (nutCaoDiem) {
            nutCaoDiem.addEventListener("click", function () {
                datCheDoMoi(CHE_DO.CAO_DIEM);
            });
        }

        if (nutNgap) {
            nutNgap.addEventListener("click", function () {
                datCheDoMoi(CHE_DO.NGAP);
            });
        }

        if (nutTimDuong) {
            nutTimDuong.addEventListener("click", timDuong);
        }

        if (nutDatLai) {
            nutDatLai.addEventListener("click", datLai);
        }

        const nutDatLaiTrenCung = document.getElementById("nutDatLaiTrenCung");

        if (nutDatLaiTrenCung) {
            nutDatLaiTrenCung.addEventListener("click", datLai);
        }

        /*
         * Dùng pha capture để chặn map.js kịp thời ở các chế độ không phải
         * tạo điểm. Ở chế độ tạo điểm, sự kiện vẫn đi tiếp để map.js xử lý.
         */
        window.addEventListener("pointerdown", batDauTheoDoi, true);
        window.addEventListener("pointerup", ketThucTheoDoi, true);
    }

    function dongBoTrangThaiCu() {
        /* Nếu map.js đã có trạng thái cạnh từ trước, đưa vào bộ nhớ của UI. */
        BanDo.layTrangThaiCanh().forEach(function (loai, idCanh) {
            loaiSuCo.set(idCanh, loai === "ngap" ? CHE_DO.NGAP : CHE_DO.CAO_DIEM);
        });
    }

    function theoDoiBanDoNapXong() {
        const khung = document.getElementById("mapZoom");

        if (!khung) {
            return;
        }

        if (laySvg()) {
            veLaiSuCo();
            return;
        }

        const theoDoi = new MutationObserver(function () {
            if (laySvg()) {
                theoDoi.disconnect();
                veLaiSuCo();
            }
        });

        theoDoi.observe(khung, { childList: true });
    }

    /* API cho ketqua.js và mophong.js dùng lại. */
    window.ThietLap = {
        veLaiSuCo: veLaiSuCo,
        datLai: datLai,
        timDuong: timDuong,
        layCheDo: function () {
            return cheDo;
        },
        layLoaiSuCo: function () {
            return new Map(loaiSuCo);
        }
    };

    dongBoTrangThaiCu();
    ganSuKien();
    capNhatGiaoDien();
    thongBaoTheoCheDo();
    theoDoiBanDoNapXong();

})();
