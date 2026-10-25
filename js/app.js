document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("id") || "armando";

    try {
        // 1. Cargar datos del usuario
        const response = await fetch(`datos/${userId}.json`);
        if (!response.ok) throw new Error("Usuario no encontrado");
        const userData = await response.json();

        // 2. Verificar y consultar contador dinámico (CountAPI)
        const isAllowed = await checkAndIncrementCounter(userData.namespaceCounter, userData.maxEscaneos);

        if (!isAllowed) {
            document.getElementById("loading").classList.add("hidden");
            document.getElementById("expired").classList.remove("hidden");
            return;
        }

        // 3. Solicitar Ubicación GPS y Notificar
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
                
                triggerAlerts(userData, mapsUrl);
                renderMedicalInfo(userData, mapsUrl);
            },
            (error) => {
                // Si deniegan la ubicación, mostramos la ficha médica de todos modos
                const mapsUrl = "Ubicación no compartida por el dispositivo";
                triggerAlerts(userData, mapsUrl);
                renderMedicalInfo(userData, mapsUrl);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );

    } catch (err) {
        alert("Error cargando la información: " + err.message);
    }
});

async function checkAndIncrementCounter(namespace, limit) {
    try {
        // Consulta e incrementa usando la API pública gratuita CountAPI
        const res = await fetch(`https://api.countapi.xyz/hit/${namespace}/visits`);
        const data = await res.json();
        
        // Si el valor superó el límite asignado
        if (data.value > limit) {
            return false;
        }
        return true;
    } catch (e) {
        // En caso de fallo de conexión de la API, permite acceso por seguridad médica
        return true; 
    }
}

function triggerAlerts(userData, mapsUrl) {
    const mensaje = encodeURIComponent(`¡EMERGENCIA! Se ha escaneado la ficha médica de ${userData.nombre}. Ubicación: ${mapsUrl}`);
    
    // Abrir envío automático al primer contacto por WhatsApp
    const primerContacto = userData.contactosEmergencia[0];
    const waUrl = `https://api.whatsapp.com/send?phone=${primerContacto}&text=${mensaje}`;
    
    // Intentar lanzar aviso en segundo plano (vía enlace directo)
    window.location.href = waUrl;
}

function renderMedicalInfo(userData, mapsUrl) {
    document.getElementById("loading").classList.add("hidden");
    const container = document.getElementById("medical-info");

    let smsList = userData.contactosEmergencia.join(",");
    let mensajeSMS = encodeURIComponent(`EMERGENCIA: Ficha de ${userData.nombre} escaneada. Ubicación: ${mapsUrl}`);
    let smsUrl = `sms:${smsList}?body=${mensajeSMS}`;

    container.innerHTML = `
        <div class="alert-header">FICHA DE EMERGENCIA MOTO</div>
        <div class="info-group">
            <label>Nombre</label>
            <span>${userData.nombre}</span>
        </div>
        <div class="info-group">
            <label>Tipo de Sangre</label>
            <span>${userData.tipoSangre}</span>
        </div>
        <div class="info-group">
            <label>Alergias</label>
            <span>${userData.alergias}</span>
        </div>
        <div class="info-group">
            <label>Padecimientos / Condiciones</label>
            <span>${userData.padecimientos}</span>
        </div>
        <div class="info-group">
            <label>Contacto Primario</label>
            <span>${userData.contactoNombre} (${userData.contactosEmergencia[0]})</span>
        </div>
        
        <a href="${smsUrl}" class="btn-emergency" style="background-color: #2980b9;">Enviar Alerta por SMS a Familia</a>
    `;
    container.classList.remove("hidden");
}