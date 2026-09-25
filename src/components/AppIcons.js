import React from 'react';
import { HandsPrayingIcon, AirplaneTiltIcon, ArrowClockwiseIcon, ArrowSquareOutIcon, ArrowUpIcon, BookOpenIcon, BowlFoodIcon, BriefcaseIcon, BuildingIcon, CakeIcon, CalendarIcon, ChatCircleIcon, CheckCircleIcon, CheckIcon, ChecksIcon, CircleIcon, CompassIcon, CookingPotIcon, CopyIcon, CrownIcon, DeviceMobileIcon, EggIcon, FileArrowUpIcon, FileTextIcon, ForkKnifeIcon, GenderFemaleIcon, GenderMaleIcon, GlobeIcon, GraduationCapIcon, GrainsIcon, HeartIcon, HouseIcon, ImageIcon, InfoIcon, LeafIcon, LockKeyIcon, MapPinIcon, PauseCircleIcon, PhoneIcon, RulerIcon, ShareNetworkIcon, ShieldCheckIcon, SlidersHorizontalIcon, SparkleIcon, StarIcon, SunHorizonIcon, TranslateIcon, TrashIcon, UserCircleGearIcon, UserCircleIcon, UserIcon, UserPlusIcon, UsersIcon, UsersThreeIcon, WarningCircleIcon, WineIcon, XCircleIcon, XIcon } from 'phosphor-react-native';
import { Colors, HobbyColors } from '../brand';

// Navigation controls keep their original neutral outline style.
export { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';

// Keep every content icon on one duotone palette, including icons on dark buttons.
function duotone(Icon, accent) {
  function ContentIcon({ color, strokeWidth, fill, ...props }) {
    const tones = HobbyColors[accent];
    const onDark = color === Colors.text.onDark || color === Colors.icon.onDark || color === '#fff' || color === 'white';
    return <Icon {...props} weight="duotone" color={onDark ? tones.selected : tones.stroke}
      duotoneColor={tones.fill} duotoneOpacity={onDark ? 0.5 : 0.28} />;
  }
  return ContentIcon;
}

export const AlertCircle = duotone(WarningCircleIcon, 'amber');
export const ArrowUp = duotone(ArrowUpIcon, 'blue');
export const Bean = duotone(GrainsIcon, 'green');
export const Beef = duotone(ForkKnifeIcon, 'coral');
export const BookOpen = duotone(BookOpenIcon, 'blue');
export const Briefcase = duotone(BriefcaseIcon, 'amber');
export const Cake = duotone(CakeIcon, 'coral');
export const Calendar = duotone(CalendarIcon, 'blue');
export const Check = duotone(CheckIcon, 'green');
export const CheckCheck = duotone(ChecksIcon, 'teal');
export const CheckCircle2 = duotone(CheckCircleIcon, 'green');
export const Church = duotone(BuildingIcon, 'violet');
export const Circle = duotone(CircleIcon, 'teal');
export const CircleCheck = duotone(CheckCircleIcon, 'green');
export const CircleX = duotone(XCircleIcon, 'coral');
export const CircleUserRound = duotone(UserCircleIcon, 'violet');
export const Compass = duotone(CompassIcon, 'teal');
export const CookingPot = duotone(CookingPotIcon, 'amber');
export const Copy = duotone(CopyIcon, 'blue');
export const Crown = duotone(CrownIcon, 'amber');
export const Egg = duotone(EggIcon, 'amber');
export const ExternalLink = duotone(ArrowSquareOutIcon, 'blue');
export const FileText = duotone(FileTextIcon, 'blue');
export const FileUp = duotone(FileArrowUpIcon, 'blue');
export const Globe = duotone(GlobeIcon, 'teal');
export const GraduationCap = duotone(GraduationCapIcon, 'green');
export const Heart = duotone(HeartIcon, 'coral');
export const Home = duotone(HouseIcon, 'amber');
export const Image = duotone(ImageIcon, 'violet');
export const Info = duotone(InfoIcon, 'blue');
export const Languages = duotone(TranslateIcon, 'blue');
export const Leaf = duotone(LeafIcon, 'green');
export const Lock = duotone(LockKeyIcon, 'amber');
export const MapPin = duotone(MapPinIcon, 'coral');
export const Mars = duotone(GenderMaleIcon, 'blue');
export const MessageCircle = duotone(ChatCircleIcon, 'blue');
export const PauseCircle = duotone(PauseCircleIcon, 'amber');
export const Phone = duotone(PhoneIcon, 'teal');
export const Plane = duotone(AirplaneTiltIcon, 'blue');
export const RotateCw = duotone(ArrowClockwiseIcon, 'teal');
export const Ruler = duotone(RulerIcon, 'violet');
export const Salad = duotone(BowlFoodIcon, 'green');
export const Share = duotone(ShareNetworkIcon, 'blue');
export const Share2 = duotone(ShareNetworkIcon, 'blue');
export const ShieldCheck = duotone(ShieldCheckIcon, 'green');
export const SlidersHorizontal = duotone(SlidersHorizontalIcon, 'teal');
export const Smartphone = duotone(DeviceMobileIcon, 'blue');
export const Sparkles = duotone(SparkleIcon, 'violet');
export const Star = duotone(StarIcon, 'amber');
export const Sunset = duotone(SunHorizonIcon, 'amber');
export const Trash2 = duotone(TrashIcon, 'coral');
export const User = duotone(UserIcon, 'violet');
export const UserCircle = duotone(UserCircleIcon, 'violet');
export const UserPlus = duotone(UserPlusIcon, 'teal');
export const UserRoundPen = duotone(UserCircleGearIcon, 'violet');
export const Users = duotone(UsersIcon, 'coral');
export const UsersRound = duotone(UsersThreeIcon, 'coral');
export const Venus = duotone(GenderFemaleIcon, 'coral');
export const Wine = duotone(WineIcon, 'violet');
export const X = duotone(XIcon, 'coral');
export const HandsPraying = duotone(HandsPrayingIcon, 'amber');
