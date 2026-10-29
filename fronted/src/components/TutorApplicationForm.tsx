import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000';

interface ApplicationStatus {
  id?: string | number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED';
  career?: string;
  subjects?: string[];
  certificateUrl?: string;
  rejectionReason?: string;
}

export default function TutorApplicationForm() {
  // Estados para los campos del formulario
  const [career, setCareer] = useState<string>('');
  const [subjects, setSubjects] = useState<string>('');
  const [motivation, setMotivation] = useState<string>('');
  const [experience, setExperience] = useState<string>('');
  const [certificate, setCertificate] = useState<File | null>(null);

  // Estados de control UI
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingStatus, setFetchingStatus] = useState<boolean>(true);
  const [applicationState, setApplicationState] = useState<ApplicationStatus>({ status: 'NOT_SUBMITTED' });
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const token = localStorage.getItem('token');

  // 1. Cargar el estado actual de la postulación desde la API al montar el componente
  useEffect(() => {
    fetchApplicationStatus();
  }, []);

  const fetchApplicationStatus = async () => {
    setFetchingStatus(true);
    try {
      const response = await fetch(`${API_URL}/applications/my-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Espera una respuesta como: { status: 'PENDING' | 'APPROVED' | 'REJECTED', ... }
        if (data && data.status) {
          setApplicationState(data);
        }
      }
    } catch (err) {
      console.error('Error al consultar el estado de la postulación:', err);
    } finally {
      setFetchingStatus(false);
    }
  };

  // 2. Manejar la selección del archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validar tamaño máximo (ej. 5 MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ text: 'El archivo excede el tamaño máximo permitido (5 MB).', type: 'error' });
        return;
      }
      setCertificate(file);
      setMessage(null);
    }
  };

  // 3. Enviar la postulación con FormData
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!certificate) {
      setMessage({ text: 'Debes adjuntar tu certificado de alumno regular o avance académico.', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      // Usamos FormData para soportar multipart/form-data (archivos)
      const formData = new FormData();
      formData.append('career', career);
      formData.append('subjects', JSON.stringify(subjects.split(',').map(s => s.trim())));
      formData.append('motivation', motivation);
      formData.append('experience', experience);
      formData.append('certificate', certificate); // Adjuntamos el archivo del certificado

      const response = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Nota: No incluir 'Content-Type', el navegador establece multipart/form-data automáticamente
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al enviar la postulación.');
      }

      setMessage({ text: '¡Postulación y certificado enviados con éxito!', type: 'success' });
      setApplicationState({
        status: 'PENDING',
        career,
        subjects: subjects.split(',').map(s => s.trim())
      });
    } catch (err: any) {
      setMessage({ text: err.message || 'No se pudo conectar con el servidor.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingStatus) {
    return (
      <div style={styles.container}>
        <p style={{ textAlign: 'center', color: '#64748B' }}>Cargando estado de postulación...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Postulación a Tutor Académico</h2>

      {/* VISTA 1: POSTULACIÓN PENDIENTE */}
      {applicationState.status === 'PENDING' && (
        <div style={styles.statusCardPending}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>⏳</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#92400E' }}>Postulación en Revisión</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#B45309' }}>
            Tu solicitud y certificado han sido recibidos correctamente. La coordinación académica está evaluando tu antecedentes.
          </p>
        </div>
      )}

      {/* VISTA 2: POSTULACIÓN APROBADA */}
      {applicationState.status === 'APPROVED' && (
        <div style={styles.statusCardApproved}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#065F46' }}>¡Felicidades! Postulación Aprobada</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#047857' }}>
            Ya eres un tutor oficial en la plataforma. Puedes acceder a tu panel para configurar tu disponibilidad de horarios.
          </p>
          <a href="/tutor/dashboard" style={styles.dashboardBtn}>Ir al Panel de Tutor</a>
        </div>
      )}

      {/* VISTA 3: POSTULACIÓN RECHAZADA */}
      {applicationState.status === 'REJECTED' && (
        <div style={styles.statusCardRejected}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>❌</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#991B1B' }}>Postulación No Aprobada</h3>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#B91C1C' }}>
            {applicationState.rejectionReason || 'Tu solicitud no cumple con los requisitos mínimos para el periodo actual.'}
          </p>
          <button 
            onClick={() => setApplicationState({ status: 'NOT_SUBMITTED' })}
            style={styles.retryBtn}
          >
            Volver a postular
          </button>
        </div>
      )}

      {/* VISTA 4: FORMULARIO DE POSTULACIÓN (Si no ha enviado o desea reintentar) */}
      {applicationState.status === 'NOT_SUBMITTED' && (
        <>
          <p style={styles.subtitle}>Completa tus datos y sube tu certificado académico para evaluar tu perfil.</p>

          {message && (
            <div style={{
              ...styles.alert,
              backgroundColor: message.type === 'success' ? '#DEF7EC' : '#FDE8E8',
              color: message.type === 'success' ? '#03543F' : '#9B1C1C',
              borderColor: message.type === 'success' ? '#84E1BC' : '#F8B4B4'
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Carrera universitaria</label>
              <input 
                type="text"
                placeholder="Ej. Ingeniería Civil en Informática"
                value={career}
                onChange={(e) => setCareer(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Materias a impartir (separadas por coma)</label>
              <input 
                type="text"
                placeholder="Ej. Programación I, Estructura de Datos, Cálculo I"
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Motivación</label>
              <textarea 
                placeholder="¿Por qué te gustaría acompañar a otros estudiantes?"
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                required
                rows={3}
                style={{ ...styles.input, resize: 'vertical' }}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Experiencia previa (Opcional)</label>
              <textarea 
                placeholder="Experiencia previa como ayudante, tutor o enseñando..."
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                rows={2}
                style={{ ...styles.input, resize: 'vertical' }}
              />
            </div>

            {/* CAMPO DE CARGA DE CERTIFICADO */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Certificado de Avance Académico o Alumno Regular (PDF o Imagen)</label>
              <input 
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                required
                style={styles.fileInput}
              />
              <span style={{ fontSize: '12px', color: '#64748B' }}>Formato PDF, PNG o JPG. Máximo 5 MB.</span>
            </div>

            <button type="submit" disabled={loading} style={styles.submitBtn}>
              {loading ? 'Subiendo certificado y enviando...' : 'Enviar Postulación con Certificado'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '620px',
    margin: '30px auto',
    padding: '32px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  title: { fontSize: '22px', fontWeight: '700', color: '#1E293B', marginBottom: '8px' },
  subtitle: { fontSize: '14px', color: '#64748B', marginBottom: '24px' },
  alert: { padding: '12px 16px', borderRadius: '8px', border: '1px solid', fontSize: '14px', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#334155' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '16px', outline: 'none' },
  fileInput: { padding: '8px', borderRadius: '8px', border: '1px dashed #CBD5E1', backgroundColor: '#F8FAFC', cursor: 'pointer' },
  submitBtn: { backgroundColor: '#2563EB', color: '#FFFFFF', padding: '12px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' },
  statusCardPending: { backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '12px', padding: '24px', textAlign: 'center' },
  statusCardApproved: { backgroundColor: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: '12px', padding: '24px', textAlign: 'center' },
  statusCardRejected: { backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '12px', padding: '24px', textAlign: 'center' },
  dashboardBtn: { display: 'inline-block', marginTop: '16px', padding: '10px 20px', backgroundColor: '#059669', color: '#FFF', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' },
  retryBtn: { marginTop: '12px', padding: '8px 16px', backgroundColor: '#DC2626', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }
};
