document.addEventListener("DOMContentLoaded", function () {
    fetch("/Student/MainSinhVien/GetStudentInfo")
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                document.getElementById("mssv").textContent = res.data.MSSV || "Chưa có dữ liệu";
                document.getElementById("hoten").textContent = res.data.HoTen;
                document.getElementById("email").textContent = res.data.Email;
                document.getElementById("vaitro").textContent = res.data.VaiTro;
            } else {
                document.getElementById("studentInfo").innerHTML =
                    `<li class="list-group-item text-danger">${res.message}</li>`;
            }
        })
        .catch(() => {
            document.getElementById("studentInfo").innerHTML =
                `<li class="list-group-item text-danger">Lỗi tải dữ liệu!</li>`;
        });
});
