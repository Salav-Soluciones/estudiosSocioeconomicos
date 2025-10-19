let users = [];

document.addEventListener("DOMContentLoaded", () => {
    obtenerLocalStorage();
    // ======== TABLA DE USUARIOS ========
   userTable = document.getElementById("userTable");
   searchInput = document.getElementById("searchInput");
   prevBtn = document.getElementById("prevPage");
   nextBtn = document.getElementById("nextPage");
   pageInfo = document.getElementById("pageInfo");
   pageInput = document.getElementById("pageInput");
   totalPages = document.getElementById("totalPages");
   goPageBtn = document.getElementById("goPage");
   tablaB= document.querySelector("tbody");

    if (!token) {
        mostrarModalMensaje("No hay sesión activa. Por favor, inicia sesión ❌");
        errorServer();
        return;
    }
    // ======= FUNCIONES =======
    async function fetchUsers() {
        try {
            const res = await axios.get(`${API_URL}user`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
            users = res.data;
            filteredUsuarios = [...users];
            renderSolicitudes();
        } catch (err) {
            if (err.response) {
                mostrarModalMensaje("Error al obtener usuarios ❌");
            } else {
                // mostrarModalMensaje("No se pudo conectar con el servidor ⚠️");
            }
        }
    }

    async function eliminarUsuario(userId, userName) {
        const modal = document.getElementById("modalConfirmar");
        const mensaje = document.getElementById("modalMensaje");
        const btnCancelar = document.getElementById("btnCancelar");
        const btnEliminar = document.getElementById("btnEliminar");

        // Mostrar modal con mensaje dinámico
        mensaje.textContent = `¿Seguro que deseas eliminar al usuario "${userName}"?`;
        modal.style.display = "flex";

        // 🔹 Devolver promesa para esperar decisión
        return new Promise((resolve) => {
            btnCancelar.onclick = () => {
                modal.style.display = "none";
                resolve(false); // usuario canceló
            };

            btnEliminar.onclick = async () => {
                modal.style.display = "none";
                try {
                    await axios.delete(`${API_URL}user/${userId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    mostrarModalMensaje("Usuario eliminado correctamente ✅");
                    searchInput.value="";
                    await fetchUsers(); // refrescar tabla
                    resolve(true);
                } catch (err) {
                    if (err.response) {
                        mostrarModalMensaje("No se pudo eliminar ❌");
                    } else {
                        // mostrarModalMensaje("No se pudo conectar con el servidor ⚠️");
                    }
                    resolve(false);
                }
            };
        });
    }

   
  eventosPaginacion();

    // Filtrar usuarios (incluye company_name si es EMPRESA)
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();
        filteredUsuarios = users.filter(user => {
            const displayName = user.user_type === "EMPRESA"
                ? user.company_name || ""
                : `${user.name || ""} ${user.f_surname || ""} ${user.s_surname || ""}`;
            return displayName.toLowerCase().includes(query);
        });
        if (filteredUsuarios.length === 0) {
            tablaB.innerHTML = `<tr><td colspan="2" style="text-align:start; color:#888;">
                No se encontraron resultados
            </td></tr>`;
            document.getElementsByClassName("pagination")[0].style.display = "none";
        } else {
            document.getElementsByClassName("pagination")[0].style.display = "flex";

            currentPage = 1;
            renderSolicitudes();
        }
    });

    // Llamada inicial
    fetchUsers();

    // Expongo la función eliminar al scope global
    window.eliminarUsuario = eliminarUsuario;
});

// === FUNCIÓN GLOBAL PARA EDITAR ===
function editarUsuario(userId) {
    window.location.href = `editUsuario.html?id=${userId}`;
}

function renderSolicitudes() {
    userTable.innerHTML = "";
    const start = (currentPage - 1) * usersPerPage;
    const end = start + usersPerPage;
    const pageUsers = filteredUsuarios.slice(start, end);

    pageUsers.forEach(user => {
        const row = document.createElement("tr");
        const displayName = user.user_type === "EMPRESA"
            ? user.company_name || "(Sin nombre de empresa)"
            : `${user.name || ""} ${user.f_surname || ""} ${user.s_surname || ""}`.trim();

        row.innerHTML = `
            <td>${displayName}</td>
            <td>${user.phone || ""}</td>
            <td>${user.state || ""}, ${user.town || ""}, ${user.settlement || ""}</td>
            <td>${user.email || ""}</td>
            <td>${user.user_type || ""}</td>
            <td class="actions">
                <button title="Editar" onclick="editarUsuario('${user._id}')">✏️</button>
                <button title="Eliminar" onclick="eliminarUsuario('${user._id}', '${displayName}')">🗑️</button>
            </td>
        `;
        userTable.appendChild(row);
    });
  actualizarPaginacion();
}
