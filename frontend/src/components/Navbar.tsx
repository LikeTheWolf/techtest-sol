import { Alignment, Button, Classes, Navbar, NavbarDivider, NavbarGroup, NavbarHeading } from '@blueprintjs/core';
import React from 'react';

interface Props {};

const CustomNavbar: React.FC<Props> = () => {
  const navbarGroupRightStyle = {
    marginLeft: 'auto',
  };
  const buttonStyle = { minWidth: '80px' };

  return (
    <Navbar>
      <NavbarGroup align={Alignment.LEFT}>
        <NavbarHeading>Algotrader-mk2</NavbarHeading>
        <NavbarDivider />
        <Button className={Classes.MINIMAL} icon="home" text="Home" style={buttonStyle}/>
      </NavbarGroup>

      <NavbarGroup align={Alignment.RIGHT} style={navbarGroupRightStyle}>
        <Button className={Classes.MINIMAL} icon="cog" style={buttonStyle}/>
      </NavbarGroup>
    </Navbar>
  );
};

export default CustomNavbar;
