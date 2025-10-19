document.addEventListener("DOMContentLoaded", () => {
    obtenerLocalStorage();

    async function fetchFreelancers() {
        try {
            const res = await axios.get(`${API_URL}user`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { user_type: "FREELANCER" }
            });
            freelancers = res.data;
        } catch (err) {
            mostrarModalMensaje("Error en la petición. Inicia sesión de nuevo. ❌");
            errorServer();
        }
    }

    async function fetchApplicants() {
        try {
            const res = await axios.get(`${API_URL}form-request?freelance_id=null`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            applicants = res.data;
            filteredUsuarios = [...applicants];
            renderSolicitudes();
        } catch (error) {
            if (error.response && error.response.status === 401) {
                mostrarModalMensaje("Sesión expirada. Inicia sesión de nuevo. ❌");
                errorServer();
            } else {
                if (token) {
                    mostrarModalMensaje("Error al obtener el progreso de usuarios. ❌");
                    errorServer();
                }
            }
        }
    }

    // 📌 Elementos del DOM
    prevBtn = document.getElementById("prevBtn");
    nextBtn = document.getElementById("nextBtn");
    pageInfo = document.getElementById("pageInfo");
    pageInput = document.getElementById("pageInput");
    goPageBtn = document.getElementById("goPage");
    tbody = document.querySelector("#tablaSolicitudes tbody");
    searchInput = document.querySelector("#searchInput");
    usersPerPage = getUsersPerPage();

    eventosPaginacion();

    // 📌 Filtro de búsqueda
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();
        filteredUsuarios = applicants.filter(a => {
            const persona = a.applicant?.person;
            return (`${persona?.name || ""} ${persona?.f_surname || ""} ${persona?.s_surname || ""}`)
                .toLowerCase()
                .includes(query);
        });

        if (filteredUsuarios.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="2" style="text-align:start; color:#888;">
                        No se encontraron resultados
                    </td>
                </tr>`;
            document.getElementsByClassName("pagination")[0].style.display = "none";
        } else {
            document.getElementsByClassName("pagination")[0].style.display = "flex";
            currentPage = 1;
            renderSolicitudes();
        }
    });

    // 📌 Inicializar
    (async () => {
        await fetchFreelancers();
        await fetchApplicants();
    })();
});

function renderSolicitudes() {
    tbody.innerHTML = "";

    // 📌 Si no hay solicitudes
    if (!filteredUsuarios || filteredUsuarios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="2" style="text-align:start; color:#888; padding:10px;">
                    No hay solicitudes pendientes.
                </td>
            </tr>`;
        document.getElementsByClassName("pagination")[0].style.display = "none";
        return;
    }

    // 📌 Si hay solicitudes
    document.getElementsByClassName("pagination")[0].style.display = "flex";

    const totalPages = Math.ceil(filteredUsuarios.length / usersPerPage) || 1;
    const start = (currentPage - 1) * usersPerPage;
    const end = start + usersPerPage;
    const pageData = filteredUsuarios.slice(start, end);

    pageData.forEach((solicitud) => {
        const persona = solicitud.applicant?.person;
        if (!persona) return;

        const nombreCompleto = `${persona.name} ${persona.f_surname || ""} ${persona.s_surname || ""}`;
        const direccion = `${persona.state || ""}, ${persona.town || ""}, ${persona.settlement || ""}\n${persona.address_references || ""}`;

        const tr = document.createElement("tr");

        // 📌 Columna nombre con tooltip
        const tdNombre = document.createElement("td");
        const divTooltip = document.createElement("div");
        divTooltip.classList.add("tooltip-inner");
        divTooltip.textContent = nombreCompleto;

        const tooltip = document.createElement("span");
        tooltip.classList.add("tooltip-text");
        tooltip.textContent = `📍 ${direccion}\n📞 ${persona.phone || ""}`;
        divTooltip.appendChild(tooltip);
        tdNombre.appendChild(divTooltip);

        // 📌 Columna select freelancer
        const tdSelect = document.createElement("td");
        const select = document.createElement("select");
        select.classList.add("freelancer-select");
        select.dataset.applicantId = solicitud._id;

        const optionDefault = document.createElement("option");
        optionDefault.textContent = "Seleccionar freelancer";
        optionDefault.value = "";
        optionDefault.selected = true;
        select.appendChild(optionDefault);

        // Opciones de freelancers
        freelancers.forEach(f => {
            const opt = document.createElement("option");
            opt.value = f._id;
            opt.textContent = `${f.name} ${f.f_surname || ""} ${f.s_surname || ""}`;
            select.appendChild(opt);
        });

        // 📌 Botón asignar
        const btnAsignar = document.createElement("button");
        btnAsignar.textContent = "Asignar";
        btnAsignar.classList.add("btn-asignar");
        btnAsignar.disabled = true;
        btnAsignar.style.marginLeft = "8px";

        function toggleButton() {
            btnAsignar.disabled = !select.value;
        }

        select.addEventListener("change", toggleButton);
        $(select).on("select2:select", toggleButton);
        $(select).on("select2:clear", toggleButton);

        btnAsignar.addEventListener("click", async () => {
            const freelancerId = select.value;
            try {
                await axios.patch(
                    `${API_URL}form-request/${solicitud._id}`,
                    { freelance_id: freelancerId },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json"
                        }
                    }
                );

                mostrarModalMensaje(
                    `Candidato asignado correctamente a ${select.options[select.selectedIndex].text} ✅`
                );

                searchInput.value = ""; // limpiar búsqueda
                tr.remove();
                filteredUsuarios = filteredUsuarios.filter(a => a._id !== solicitud._id);
                renderSolicitudes();
            } catch (err) {
                mostrarModalMensaje("Error al asignar freelancer ❌");
            }
        });

        tdSelect.appendChild(select);
        tdSelect.appendChild(btnAsignar);
        tr.appendChild(tdNombre);
        tr.appendChild(tdSelect);
        tbody.appendChild(tr);

        // Iniciar select2
        $(select).select2({
            placeholder: "Seleccionar freelancer",
            allowClear: true,
            minimumResultsForSearch: 0
        });
    });

    actualizarPaginacion();
}