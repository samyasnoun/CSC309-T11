import './City.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCities } from '../contexts/CitiesContext';

const City = ({ city }) => {
    const [temperature, setTemperature] = useState(null);
    const navigate = useNavigate();
    const { removeCity } = useCities();

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const loadTemperature = async () => {
            try {
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current_weather=true`, { signal: controller.signal });
                if (!response.ok) {
                    throw new Error(`Failed to fetch temperature for ${city.name}`);
                }
                const data = await response.json();
                if (isMounted) {
                    setTemperature(data.current_weather?.temperature ?? null);
                }
            }
            catch (error) {
                console.error(error);
                if (isMounted) {
                    setTemperature(null);
                }
            }
        };

        loadTemperature();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [city.latitude, city.longitude, city.name]);

    const handle_click = () => {
        navigate(`/${city.id}`);
    };

    return (
        <div className="city-card">
            <button className="remove-btn" onClick={() => removeCity(city.id)}>×</button>
            <div className="city-content" onClick={handle_click} role="button" tabIndex={0} onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handle_click();
                }
            }}>
                <h2>{city.name}</h2>
                {temperature !== null ? (
                    <p className="temperature">{temperature}°C</p>
                ) : (
                    <div className="spinner"></div>
                )}
            </div>
        </div>
    );
};

export default City;