import './AddCity.css';
import { forwardRef, useState } from "react";
import { useCities } from "../contexts/CitiesContext";

const AddCity = forwardRef(({ setError }, ref) => {
    const [cityName, setCityName] = useState("");
    const { addCity } = useCities();

    const handle_submit = async (e) => {
        e.preventDefault();

        const trimmedName = cityName.trim();
        if (!trimmedName) {
            setError("City name cannot be blank.");
            return;
        }

        try {
            setError("");
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmedName)}&limit=1`, {
                headers: {
                    'User-Agent': 'ACoolWeatherApp/0.1 (asnounsa@cs.toronto.edu)'
                }
            });

            if (!response.ok) {
                throw new Error(`Unable to fetch coordinates for ${trimmedName}`);
            }

            const results = await response.json();
            if (!Array.isArray(results) || results.length === 0) {
                setError(`City '${trimmedName}' is not found.`);
                return;
            }

            const { lat, lon } = results[0];
            addCity({ name: trimmedName, latitude: parseFloat(lat), longitude: parseFloat(lon) });

            setCityName("");
            ref.current?.close();
        }
        catch (error) {
            console.error(error);
            setError("Unable to add city right now. Please try again later.");
        }
    };

    return (
        <dialog ref={ref}>
            <div className="dialog-header">
                <span>Add A City</span>
                <a onClick={() => ref.current?.close()}>✖</a>
            </div>

            <form onSubmit={handle_submit}>
                <input
                    type="text"
                    placeholder="Enter City Name"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    required
                />
                
                <div className="button-group">
                    <button type="submit">Add</button>
                    <button type="button" onClick={() => ref.current?.close()}>
                        Close
                    </button>
                </div>
            </form>
        </dialog>
    );
});

export default AddCity;
