import "./Detail.css";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCities } from "../contexts/CitiesContext";
import NotFound from "./NotFound";

function Weather({ city }) {
    const [weather, setWeather] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const loadWeather = async () => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,wind_speed_10m,relative_humidity_2m,precipitation_probability`;
                const response = await fetch(url, { signal: controller.signal });
                if (!response.ok) {
                    throw new Error(`Failed to fetch weather for ${city.name}`);
                }
                const data = await response.json();
                if (isMounted) {
                    setWeather(data.current);
                }
            }
            catch (error) {
                console.error(error);
                if (isMounted) {
                    setWeather(null);
                }
            }
        };

        loadWeather();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [city.latitude, city.longitude, city.name]);

    const handle_click = () => {
        navigate("/");
    };

    return <>
        <h1>{city.name}</h1>
        {weather ? <div className="weather-info">
            <div>
                <h3>Temperature</h3>
                <p>{weather.temperature_2m}°C</p>
            </div>
            <div>
                <h3>Humidity</h3>
                <p>{weather.relative_humidity_2m}%</p>
            </div>
            <div>
                <h3>Wind</h3>
                <p className="small">{weather.wind_speed_10m} km/h</p>
            </div>
            <div>
                <h3>Precipitation</h3>
                <p>{weather.precipitation_probability}%</p>
            </div>
        </div> : <div className="spinner"></div>}
        <button className="btn" onClick={handle_click}>Back</button>
    </>;
}

function Detail() {
    const { cityId } = useParams();
    const { cities } = useCities();

    const numericCityId = Number(cityId);
    const city = cities.find((c) => c.id === numericCityId);
    if (!city) {
        return <NotFound />;
    }

    return <Weather city={city} />;
}

export default Detail;