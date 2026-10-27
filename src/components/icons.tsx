import { forwardRef, type SVGProps } from 'react';
import { clsx } from 'clsx';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowHorizontalIcon,
  ArrowLeft01Icon,
  ArrowLeft02Icon,
  ArrowLeftRightIcon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  ArrowUp01Icon,
  ArrowUp02Icon,
  ArrowUpRight01Icon,
  BalanceScaleIcon,
  BrowserIcon,
  Calendar01Icon,
  CalendarCheck01Icon,
  Cancel01Icon,
  ChartBarLineIcon,
  ChartLineData01Icon,
  CloudIcon,
  CloudOffIcon,
  CloudSavingDone01Icon,
  CrownIcon,
  DatabaseIcon,
  Dumbbell01Icon,
  Fire02Icon,
  FireIcon,
  Flag01Icon,
  FlashIcon,
  FloppyDiskIcon,
  GithubIcon,
  GoogleIcon,
  HandGripIcon,
  HandIcon,
  HourglassIcon,
  LegalHammerIcon,
  Link01Icon,
  Loading03Icon,
  Location01Icon,
  LockIcon,
  Login01Icon,
  Logout01Icon,
  Moon02Icon,
  NewsIcon,
  RefreshIcon,
  RunningShoesIcon,
  Search01Icon,
  SecurityCheckIcon,
  ServerStack01Icon,
  Share08Icon,
  Shield01Icon,
  SquareArrowUpRightIcon,
  StarIcon,
  Sun03Icon,
  TableIcon,
  Target01Icon,
  Tick02Icon,
  Timer02Icon,
  TradeDownIcon,
  TradeUpIcon,
  TrophyIcon,
  UndoIcon,
  UnfoldMoreIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserIcon,
  UserMultipleIcon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';

/* Ícones do site: Hugeicons (traço arredondado, versão gratuita), expostos com os mesmos nomes e props que o site já
   usava (className, size, weight), então trocar de pack é mexer só neste arquivo.
   - weight "bold" engrossa o traço; "fill" preenche o desenho nos ícones que ficam bem cheios (troféu, coroa, estrela,
     raio, fogo, play) e, nos demais, vira traço grosso. */

type IconWeight = 'regular' | 'bold' | 'fill' | 'duotone';
type Props = Omit<SVGProps<SVGSVGElement>, 'ref' | 'strokeWidth'> & { size?: number | string; weight?: IconWeight };

const make = (icon: IconSvgElement, fillable = false) =>
  forwardRef<SVGSVGElement, Props>(function Icon({ size = '1em', weight = 'regular', className, ...rest }, ref) {
    const strokeWidth = weight === 'regular' ? 1.6 : weight === 'duotone' ? 1.8 : 2;
    return (
      <HugeiconsIcon ref={ref} icon={icon} size={size as number} strokeWidth={strokeWidth} aria-hidden={rest['aria-label'] ? undefined : true}
        className={clsx(fillable && weight === 'fill' && '[&_path]:fill-current', className)} {...rest} />
    );
  });

export const ArrowClockwise = make(RefreshIcon);
export const ArrowCounterClockwise = make(UndoIcon);
export const ArrowsClockwise = make(RefreshIcon);
export const ArrowDown = make(ArrowDown02Icon);
export const ArrowUp = make(ArrowUp02Icon);
export const ArrowLeft = make(ArrowLeft02Icon);
export const ArrowRight = make(ArrowRight02Icon);
export const ArrowUpRight = make(ArrowUpRight01Icon);
export const ArrowSquareOut = make(SquareArrowUpRightIcon);
export const ArrowsLeftRight = make(ArrowLeftRightIcon);
export const ArrowsOutLineHorizontal = make(ArrowHorizontalIcon);
export const Barbell = make(Dumbbell01Icon);
export const Browser = make(BrowserIcon);
export const CalendarBlank = make(Calendar01Icon);
export const CalendarCheck = make(CalendarCheck01Icon);
export const CaretDown = make(ArrowDown01Icon);
export const CaretUp = make(ArrowUp01Icon);
export const CaretLeft = make(ArrowLeft01Icon);
export const CaretRight = make(ArrowRight01Icon);
export const CaretUpDown = make(UnfoldMoreIcon);
export const ChartBarHorizontal = make(ChartBarLineIcon);
export const ChartLineUp = make(ChartLineData01Icon);
export const Check = make(Tick02Icon);
export const CircleNotch = make(Loading03Icon);
export const Cloud = make(CloudIcon);
export const CloudCheck = make(CloudSavingDone01Icon);
export const CloudSlash = make(CloudOffIcon);
export const Crown = make(CrownIcon, true);
export const Database = make(DatabaseIcon);
export const Eye = make(ViewIcon);
export const EyeSlash = make(ViewOffIcon);
export const Fire = make(FireIcon, true);
export const Flame = make(Fire02Icon, true);
export const Flag = make(Flag01Icon);
export const FloppyDisk = make(FloppyDiskIcon);
export const Gavel = make(LegalHammerIcon);
export const GithubLogo = make(GithubIcon);
export const GoogleLogo = make(GoogleIcon);
export const Hand = make(HandIcon);
export const HandGrabbing = make(HandGripIcon);
export const HardDrives = make(ServerStack01Icon);
export const HourglassMedium = make(HourglassIcon);
export const Lightning = make(FlashIcon, true);
export const LinkSimple = make(Link01Icon);
export const LockSimple = make(LockIcon);
export const MagnifyingGlass = make(Search01Icon);
export const MapPin = make(Location01Icon);
export const Moon = make(Moon02Icon);
export const Sun = make(Sun03Icon);
export const Newspaper = make(NewsIcon);
export const PersonSimpleRun = make(RunningShoesIcon);
export const Scales = make(BalanceScaleIcon);
export const ShareNetwork = make(Share08Icon);
export const Shield = make(Shield01Icon);
export const ShieldCheck = make(SecurityCheckIcon);
export const SignIn = make(Login01Icon);
export const SignOut = make(Logout01Icon);
export const Star = make(StarIcon, true);
export const Table = make(TableIcon);
export const Target = make(Target01Icon);
export const Timer = make(Timer02Icon);
export const TrendDown = make(TradeDownIcon);
export const TrendUp = make(TradeUpIcon);
export const Trophy = make(TrophyIcon, true);
export const User = make(UserIcon);
export const UserCircle = make(UserCircleIcon);
export const Users = make(UserGroupIcon);
export const UsersThree = make(UserMultipleIcon);
export const WarningCircle = make(AlertCircleIcon);
export const X = make(Cancel01Icon);
