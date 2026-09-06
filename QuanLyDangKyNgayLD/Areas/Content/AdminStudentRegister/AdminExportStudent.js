document.addEventListener("DOMContentLoaded", function () {
    const btnExport = document.getElementById("exportAllAccountstudent");
    if (!btnExport) return;

    btnExport.addEventListener("click", function () {
        const searchInput = document.getElementById("searchBox");
        const khoaSelect = document.getElementById("roleFilter");
        const search = searchInput ? searchInput.value.trim() : "";
        const khoa = khoaSelect ? khoaSelect.value.trim() : "";

        let url = `/Admin/AdminStudent/exportAllAccountstudent?search=${encodeURIComponent(search)}&khoa=${encodeURIComponent(khoa)}`;
        window.location.href = url;
    });
});
