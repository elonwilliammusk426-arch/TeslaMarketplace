import React, { memo, useMemo } from 'react';
import { ContactShadows } from '@react-three/drei';

const MODEL_DIMENSIONS = {
  'Model 3': { length: 4.35, width: 1.86, height: 1.42, wheelbase: 2.88, roof: 1.18 },
  'Model Y': { length: 4.75, width: 1.92, height: 1.62, wheelbase: 2.89, roof: 1.34 },
  'Model S': { length: 4.97, width: 1.96, height: 1.44, wheelbase: 2.96, roof: 1.20 },
  'Model X': { length: 5.04, width: 2.00, height: 1.68, wheelbase: 2.96, roof: 1.38 }
};

const WHEEL_POSITIONS = (d) => [
  [-d.wheelbase / 2, 0.34, d.width / 2 - 0.08],
  [d.wheelbase / 2, 0.34, d.width / 2 - 0.08],
  [-d.wheelbase / 2, 0.34, -d.width / 2 + 0.08],
  [d.wheelbase / 2, 0.34, -d.width / 2 + 0.08]
];

function Wheel({ position, sport }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.22, sport ? 20 : 16]} />
        <meshStandardMaterial color="#111111" roughness={0.72} metalness={0.12} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.235, sport ? 20 : 16]} />
        <meshStandardMaterial color="#c7c9cc" roughness={0.3} metalness={0.82} />
      </mesh>
    </group>
  );
}

function TeslaModel3D({ model = 'Model Y', color = '#e9e9e9', options = {} }) {
  const d = MODEL_DIMENSIONS[model] || MODEL_DIMENSIONS['Model Y'];
  const sport = String(options.wheels?.name || '').toLowerCase().includes('sport');
  const interior = String(options.interior?.name || '').toLowerCase();
  const glass = interior.includes('white') ? '#f1f1f1' : '#17191c';

  const body = useMemo(() => ({
    length: d.length,
    width: d.width,
    bodyHeight: model === 'Model X' ? 0.68 : 0.60,
    cabinLength: d.length * 0.48,
    cabinWidth: d.width * 0.78,
    cabinHeight: d.roof
  }), [d, model]);

  return (
    <group rotation={[0, Math.PI / 2, 0]} scale={0.92}>
      <mesh position={[0, 0.57, 0]} castShadow receiveShadow>
        <boxGeometry args={[body.length, body.bodyHeight, body.width]} />
        <meshStandardMaterial color={color} metalness={0.72} roughness={0.2} />
      </mesh>

      <mesh position={[0.18, 0.94, 0]} castShadow>
        <boxGeometry args={[body.cabinLength, body.cabinHeight * 0.62, body.cabinWidth]} />
        <meshStandardMaterial color={color} metalness={0.68} roughness={0.22} />
      </mesh>

      <mesh position={[0.20, 1.00, 0]}>
        <boxGeometry args={[body.cabinLength * 0.82, body.cabinHeight * 0.48, body.cabinWidth * 0.96]} />
        <meshPhysicalMaterial color={glass} roughness={0.08} metalness={0.12} transmission={0.08} transparent opacity={0.88} />
      </mesh>

      <mesh position={[-body.length * 0.44, 0.72, 0]}>
        <boxGeometry args={[0.06, 0.08, body.width * 0.68]} />
        <meshStandardMaterial color="#050505" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[body.length * 0.44, 0.72, 0]}>
        <boxGeometry args={[0.06, 0.08, body.width * 0.68]} />
        <meshStandardMaterial color="#050505" roughness={0.3} metalness={0.6} />
      </mesh>

      {WHEEL_POSITIONS(d).map((position, index) => (
        <Wheel key={index} position={position} sport={sport} />
      ))}

      <mesh position={[body.length * 0.44, 0.60, 0]}>
        <boxGeometry args={[0.025, 0.11, body.width * 0.5]} />
        <meshStandardMaterial color="#7f0c0c" emissive="#2d0000" emissiveIntensity={0.35} />
      </mesh>

      <mesh position={[-body.length * 0.44, 0.60, 0]}>
        <boxGeometry args={[0.025, 0.10, body.width * 0.42]} />
        <meshStandardMaterial color="#ffffff" emissive="#222222" emissiveIntensity={0.25} />
      </mesh>

      <ContactShadows position={[0, 0.02, 0]} opacity={0.32} scale={7} blur={2.4} far={3.5} resolution={256} />
    </group>
  );
}

export default memo(TeslaModel3D);
