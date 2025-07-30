// Utiliser l'API Python déployée sur Vercel
export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  // URL de l'API Vercel - utilise la même origine que l'app
  const baseUrl = window.location.origin;
  
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erreur API:', error);
    throw error;
  }
}; 