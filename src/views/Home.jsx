import React from 'react';
import { useTranslation } from "react-i18next";
const Home = (props) => {
  const { t, i18n } = useTranslation();
  return (
    <h2>Home ({t('welcome')}) </h2>
  );
};

export default Home;