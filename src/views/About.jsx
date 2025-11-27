import React from 'react';
import { useSelector } from 'react-redux';

const About = (props) => {
  const user = useSelector((state) => state.user.user);

  return (
    <h2>About({user.deptNm})</h2>
  );
};

export default About;