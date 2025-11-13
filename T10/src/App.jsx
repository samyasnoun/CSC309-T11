import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CitiesProvider } from './contexts/CitiesContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Detail from './pages/Detail';

const App = () => {
    return <CitiesProvider>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path=":cityId" element={<Detail />} />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
        </BrowserRouter>
    </CitiesProvider>;
};

export default App;