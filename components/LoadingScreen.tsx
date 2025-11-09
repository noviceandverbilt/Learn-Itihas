
import React from 'react';
import { LoaderIcon } from './icons';

const LoadingScreen: React.FC = () => {
    return (
        <div className="loading-screen">
            <LoaderIcon className="spinner" />
            <p>Loading...</p>
        </div>
    );
};

export default LoadingScreen;
