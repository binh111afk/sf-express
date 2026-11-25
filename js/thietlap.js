"use strict";

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
    const chkQuayVe = document.getElementById("chkQuayVe");
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

    /* Chuỗi mô tả trạng thái điểm; dùng để biết một cú bấm có thay đổi điểm không. */
    function chuKyDiem() {
        return BanDo.layDanhSachDiemChon().join(",") + "|" + BanDo.layDanhSachDiemHien().join(",");
    }

    /* =========================================================
       2. ĐỔI CHẾ ĐỘ VÀ CẬP NHẬT GIAO DIỆN
       ========================================================= */

    function datCheDoMoi(cheDoMoi) {
        /* Bấm lại đúng nút đang bật thì tắt chế độ. */
        cheDo = (cheDo === cheDoMoi) ? CHE_DO.KHONG : cheDoMoi;

        /* gọi map.js */
        BanDo.datCheDo("chonDiem");

        capNhatGiaoDien();
        thongBaoTheoCheDo();
    }

    function thongBaoTheoCheDo() {
        if (cheDo === CHE_DO.TAO_DIEM) {
            thongBao("Đang bật tạo điểm. Bấm lần 1 để hiện điểm, bấm lần 2 để chọn điểm giao hàng.");
        } else if (cheDo === CHE_DO.HUY_DIEM) {
            thongBao("Đang bật hủy điểm. Bấm vào một điểm đã tạo để ẩn điểm đó.");
        } else if (cheDo === CHE_DO.CAO_DIEM) {
            thongBao("Đang bật giờ cao điểm. Bấm vào đoạn đường để đánh dấu; bấm lại để bỏ. Đoạn này sẽ bị tránh khi tính lộ trình.");
        } else if (cheDo === CHE_DO.NGAP) {
            thongBao("Đang bật ngập lụt. Bấm vào đoạn đường để đánh dấu; bấm lại để bỏ. Đoạn ngập sẽ bị tránh hoàn toàn.");
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
        //kiem tra có ấn vào vùng bản đồ hoặc các nút điều kiển không
        if (!o1.contains(e.target) || e.target.closest(".dieukhien")) {
            lanBam = null;
            return;
        }
        //kiem tra có ấn bằng chuột trái không
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

        /* Chế độ tạo điểm để map.js tự xử lý */
        if (cheDo === CHE_DO.TAO_DIEM) {
            /* Chụp trạng thái trước; sau khi map.js chạy xong mới so sánh. */
            const truoc = chuKyDiem();

            setTimeout(function () {
                if (chuKyDiem() !== truoc) {
                    capNhatSauThayDoi();
                } else {
                    capNhatSoLieu();
                }
            }, 0);
            return;
        }

       
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

        
        BanDo.anDiem(nut.id);
        thongBao("Đã ẩn điểm " + nut.id + ".", "ok");
        capNhatSauThayDoi();
    }

    /* Hàm này giữ map.js luôn biết đoạn nào bị chặn */
    function dongBoTrangThaiMap(idCanh) {
        if (loaiSuCo.has(idCanh)) {
            BanDo.datTrangThaiCanh(idCanh, "ngap");
        } else {
            BanDo.xoaTrangThaiCanh(idCanh);
        }
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
            loaiSuCo.delete(canh.id);
            thongBao("Đã bỏ đánh dấu " + tenLoai + " cho đoạn " + canh.id + ".", "ok");
        } else {
            loaiSuCo.set(canh.id, loai);
            thongBao("Đã đánh dấu " + tenLoai + " cho đoạn " + canh.id + ".", "ok");
        }

        dongBoTrangThaiMap(canh.id);
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
            svg.appendChild(nhom);//cho nhom vao svg    
        }

        nhom.replaceChildren();// làm mới lớp

        //tim cạnh và đỉnh bằng map
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

            /* Vẽ theo đường phố thật (nếu tìm được), không nối thẳng hai nút. */
            const diemDuong = (window.KetQua && window.KetQua.diemTheoDuong)
                ? window.KetQua.diemTheoDuong([canh.a, canh.b])
                : [a, b];

            const duong = document.createElementNS(SVG_NS, "polyline");
            duong.setAttribute("points", diemDuong.map(function (p) {
                return p.x + "," + p.y;
            }).join(" "));
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
    //được gọi mỗi khi người dùng thêm, sửa hoặc xóa một sự cố trên bản đồ 

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

        /* đưa cạnh bị ngập và cao điểm vào một Set */
        const canhBiChan = new Set(loaiSuCo.keys());

        const ketQua = window.Thuattoan.timLoTrinh(duLieu, kho.id, diemNhan, {
            canhBiChan: canhBiChan
        });

        /* Tùy chọn quay về Kho: nối thêm chặng từ điểm cuối về Kho, cũng tránh đoạn bị đánh dấu. */
        let canhBaoVe = null;

        if (ketQua.ok && chkQuayVe && chkQuayVe.checked) {
            const diemCuoi = ketQua.khuc[ketQua.khuc.length - 1].den;
            const ve = window.Thuattoan.timDuongNgan(duLieu, diemCuoi, kho.id, {
                canhBiChan: canhBiChan
            });

            if (ve.ok) {
                ketQua.khuc.push({ tu: diemCuoi, den: kho.id, duong: ve.duong, km: ve.km, kmThuc: ve.km });
                ketQua.tongKm += ve.km;
            } else {
                canhBaoVe = "Không tìm được đường về Kho: " + ve.loi;
            }
        }

        if (window.KetQua) {
            window.KetQua.hienTuyen(ketQua);
        }

        veLaiSuCo();//ve sự có sau để sự cố nằm trên tuyến dường

        if (ketQua.ok) {
            let chu = "Đã tính lộ trình qua " + ketQua.khuc.length + " chặng.";

            if (ketQua.khongToiDuoc.length > 0) {
                chu += " Có " + ketQua.khongToiDuoc.length + " điểm không tới được.";
            }

            if (canhBaoVe) {
                chu += " " + canhBaoVe;
            }

            thongBao(chu, "ok");
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

    /* API cho ketqua.js dùng lại. */
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