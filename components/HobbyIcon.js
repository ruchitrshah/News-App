import React from 'react';
import {
  BookOpenIcon, AirplaneTiltIcon, CookingPotIcon, MusicNotesIcon,
  PersonSimpleRunIcon, TrophyIcon, CameraIcon, PaletteIcon, GameControllerIcon,
  FlowerLotusIcon, WindIcon, MountainsIcon, PlantIcon, PenNibIcon, FilmSlateIcon,
  MaskHappyIcon, HandHeartIcon, CircleIcon,
} from 'phosphor-react-native';
import { HobbyColors } from '../brand';

const icons = {
  reading: [BookOpenIcon, 'blue'], traveling: [AirplaneTiltIcon, 'teal'],
  cooking: [CookingPotIcon, 'amber'], music: [MusicNotesIcon, 'violet'],
  dancing: [PersonSimpleRunIcon, 'coral'], sports: [TrophyIcon, 'amber'],
  photography: [CameraIcon, 'blue'], painting: [PaletteIcon, 'coral'],
  gaming: [GameControllerIcon, 'violet'], yoga: [FlowerLotusIcon, 'coral'],
  meditation: [WindIcon, 'teal'], hiking: [MountainsIcon, 'green'],
  gardening: [PlantIcon, 'green'], writing: [PenNibIcon, 'blue'],
  movies: [FilmSlateIcon, 'violet'], theatre: [MaskHappyIcon, 'amber'],
  volunteering: [HandHeartIcon, 'coral'],
};

export default function HobbyIcon({ name, selected = false, style }) {
  const [Icon, accent] = icons[String(name || '').trim().toLowerCase()] || [CircleIcon, 'teal'];
  const colors = HobbyColors[accent];
  return (
    <Icon size={22} weight="duotone" color={selected ? colors.selected : colors.stroke}
      duotoneColor={colors.fill} duotoneOpacity={selected ? 0.5 : 0.28}
      style={style} accessible={false} aria-hidden />
  );
}
