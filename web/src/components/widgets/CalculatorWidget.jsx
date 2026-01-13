import { Calculate } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';
import CalculatorContent from '../tools/CalculatorContent';

export default function CalculatorWidget() {
  return (
    <WidgetWrapper title="Calculator" icon={<Calculate />} color="primary">
      <CalculatorContent />
    </WidgetWrapper>
  );
}
