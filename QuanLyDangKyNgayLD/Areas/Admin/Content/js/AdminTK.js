function loadData(page = 1) {
    const khoa = document.getElementById("khoaFilter").value;
    const lop = document.getElementById("lopFilter").value;

    fetch(`/Admin/AdminTK/LoadData?khoa=${encodeURIComponent(khoa)}&lop=${encodeURIComponent(lop)}&page=${page}`)
        .then(res => res.json())
        .then(data => {
            // Thống kê
            document.getElementById("stats-bar").innerHTML = `
                <div class="col-md-4"><div class="card text-white bg-primary"><div class="card-header">Tổng số sinh viên</div><div class="card-body"><h5>${data.Stats.TongSinhVien}</h5></div></div></div>
                <div class="col-md-4"><div class="card text-white bg-success"><div class="card-header">Đã hoàn thành (≥18 ngày)</div><div class="card-body"><h5>${data.Stats.DaHoanThanh}</h5></div></div></div>
                <div class="col-md-4"><div class="card text-white bg-danger"><div class="card-header">Chưa hoàn thành</div><div class="card-body"><h5>${data.Stats.ChuaHoanThanh}</h5></div></div></div>
            `;

            // Tiến độ
            document.getElementById("progress-bar").innerHTML = `
                <h5>Tiến độ hoàn thành:</h5>
                <div class="progress">
                    <div class="progress-bar" role="progressbar"
                         style="width:${data.Stats.TienDoHoanThanh}%"
                         aria-valuenow="${data.Stats.TienDoHoanThanh}" aria-valuemin="0" aria-valuemax="100">
                        ${data.Stats.TienDoHoanThanh}%
                    </div>
                </div>
            `;

            // Bảng sinh viên
            let rows = "";
            if (data.Students.length > 0) {
                let stt = (data.Pagination.CurrentPage - 1) * 5 + 1;
                data.Students.forEach(sv => {
                    rows += `<tr>
                        <td class="text-center">${stt}</td>
                        <td class="text-center">${sv.MSSV}</td>
                        <td>${sv.HoTen}</td>
                        <td class="text-center">${sv.Lop}</td>
                        <td>${sv.Khoa}</td>
                        <td class="text-center fw-bold">${sv.SoNgay}</td>
                    </tr>`;
                    stt++;
                });
            } else {
                rows = `<tr><td colspan="6" class="text-center text-danger py-3">
                            Không có dữ liệu cho khoa/lớp đã chọn
                        </td></tr>`;
            }

            document.getElementById("studentTable").innerHTML = `
                <table class="table table-bordered table-hover">
                    <thead class="table-primary text-center">
                        <tr><th>STT</th><th>MSSV</th><th>Họ và tên</th><th>Lớp</th><th>Khoa</th><th>Số ngày đã hoàn thành</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;

            // Pagination
            let pag = "";
            if (data.Students.length > 0 && data.Pagination.TotalPages > 1) {
                pag = `<ul class="pagination">`;
                pag += `<li class="page-item ${data.Pagination.CurrentPage == 1 ? "disabled" : ""}">
                            <a href="#" class="page-link" onclick="loadData(${data.Pagination.CurrentPage - 1});return false;">&laquo;</a>
                        </li>`;
                for (let i = 1; i <= data.Pagination.TotalPages; i++) {
                    pag += `<li class="page-item ${i == data.Pagination.CurrentPage ? "active" : ""}">
                                <a href="#" class="page-link" onclick="loadData(${i});return false;">${i}</a>
                            </li>`;
                }
                pag += `<li class="page-item ${data.Pagination.CurrentPage == data.Pagination.TotalPages ? "disabled" : ""}">
                            <a href="#" class="page-link" onclick="loadData(${data.Pagination.CurrentPage + 1});return false;">&raquo;</a>
                        </li>`;
                pag += `</ul>`;
            }
            document.getElementById("pagination").innerHTML = pag;
        });
}

function loadLopByKhoa(khoa) {
    const lopSelect = document.getElementById("lopFilter");

    if (khoa === "") {
        lopSelect.innerHTML = `<option value="">-- Tất cả lớp --</option>`;
        return;
    }

    fetch(`/Admin/AdminTK/GetLopByKhoa?khoa=${encodeURIComponent(khoa)}`)
        .then(res => res.json())
        .then(data => {
            lopSelect.innerHTML = `<option value="">-- Tất cả lớp --</option>`;
            data.forEach(lop => {
                lopSelect.innerHTML += `<option value="${lop}">${lop}</option>`;
            });
        });
}

function exportExcel() {
    const khoa = document.getElementById("khoaFilter").value;
    const lop = document.getElementById("lopFilter").value;
    window.location.href = `/Admin/AdminTK/ExportExcel?khoa=${encodeURIComponent(khoa)}&lop=${encodeURIComponent(lop)}`;
}

document.addEventListener("DOMContentLoaded", () => {
    loadLopByKhoa(document.getElementById("khoaFilter").value);
    loadData(1);
    document.getElementById("khoaFilter").addEventListener("change", function () {
        loadLopByKhoa(this.value);
        loadData(1);
    });
    document.getElementById("lopFilter").addEventListener("change", function () {
        loadData(1);
    });
});
