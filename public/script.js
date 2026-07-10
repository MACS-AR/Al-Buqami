const apiEngine = {
    getServices: async () => {
        const res = await fetch('/api/services');
        return await res.json();
    },
    addBooking: async (data) => {
        await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }
};

async function initPage() {
    const container = document.getElementById('servicesContainer');
    const select = document.getElementById('clientServiceSelect');
    if(!container || !select) return;
    
    container.innerHTML = '';
    select.innerHTML = '<option value="">-- الرجاء اختيار خدمة --</option>';
    
    const services = await apiEngine.getServices();
    if(services.length === 0) {
        container.innerHTML = '<p style="text-align:center; grid-column:1/-1; color: #94A3B8;">لا توجد خدمات متاحة حالياً.</p>';
        return;
    }
    
    services.forEach(srv => {
        const card = document.createElement('div');
        card.className = 'service-card';
        let fieldsBadge = srv.customFields && srv.customFields.length > 0 ? srv.customFields.map(f => f.name).join('، ') : 'متطلبات أساسية';
        card.innerHTML = `
            <div>
                <h3>${srv.name}</h3>
                <p>${srv.description}</p>
            </div>
            <div>
                <div class="service-meta">
                    <span class="service-price">السعر: ${srv.price} ريال</span>
                    <span>⏱️ ${srv.time}</span>
                </div>
                <div style="font-size:0.8rem; color:#94A3B8; margin-bottom:15px;">الطلبات: ${fieldsBadge}</div>
                <a href="#booking" class="btn-royal" style="width:100%; text-align:center; padding:10px 0; font-size:0.95rem;" onclick="selectServiceForBooking('${srv.id}')">احجز الآن</a>
            </div>
        `;
        container.appendChild(card);

        const option = document.createElement('option');
        option.value = srv.id;
        option.innerText = srv.name;
        select.appendChild(option);
    });
}

window.selectServiceForBooking = function(id) {
    const select = document.getElementById('clientServiceSelect');
    if(select) { select.value = id; handleServiceSelectionChange(); }
};

window.handleServiceSelectionChange = async function() {
    const select = document.getElementById('clientServiceSelect');
    const containerBox = document.getElementById('dynamicFieldsContainer');
    const inputsContainer = document.getElementById('dynamicFieldsInputs');
    if(!select || !containerBox || !inputsContainer) return;
    
    inputsContainer.innerHTML = '';
    containerBox.style.display = 'none';
    if(!select.value) return;

    const services = await apiEngine.getServices();
    const selectedService = services.find(s => s.id === select.value);

    if(selectedService && selectedService.customFields && selectedService.customFields.length > 0) {
        containerBox.style.display = 'block';
        selectedService.customFields.forEach(field => {
            const group = document.createElement('div');
            group.className = 'form-group';
            let inputHtml = field.type === 'مرفق ملف' ? `<input type="file" class="form-control dynamic-custom-input" data-fieldname="${field.name}" required>` : (field.type === 'رقمي' ? `<input type="number" class="form-control dynamic-custom-input" data-fieldname="${field.name}" required>` : `<input type="text" class="form-control dynamic-custom-input" data-fieldname="${field.name}" required>`);
            group.innerHTML = `<label>${field.name} <span style="color:red;">*</span></label>${inputHtml}`;
            inputsContainer.appendChild(group);
        });
    }
};

window.submitClientBooking = async function() {
    const name = document.getElementById('clientName').value;
    const phone = document.getElementById('clientPhone').value;
    const serviceId = document.getElementById('clientServiceSelect').value;
    
    const services = await apiEngine.getServices();
    const selectedService = services.find(s => s.id === serviceId);

    let dynamicData = [];
    document.querySelectorAll('.dynamic-custom-input').forEach(input => {
        dynamicData.push({ fieldName: input.getAttribute('data-fieldname'), value: input.type === 'file' ? (input.files[0] ? input.files[0].name : 'ملف مرفق') : input.value });
    });

    await apiEngine.addBooking({ clientName: name, clientPhone: phone, serviceName: selectedService ? selectedService.name : 'خدمة غير معروفة', customData: dynamicData });
    alert('تم إرسال حجزك بنجاح لمؤسسة البقمي!');
    document.getElementById('clientBookingForm').reset();
    handleServiceSelectionChange();
};

window.onload = initPage;
