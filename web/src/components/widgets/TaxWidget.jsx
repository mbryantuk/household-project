import { Payments } from '@mui/icons-material';
import WidgetWrapper from './WidgetWrapper';
import TaxCalculatorContent from '../tools/TaxCalculatorContent';

export default function TaxWidget() {
  return (
    <WidgetWrapper title="Tax & Stamp Duty" icon={<Payments />} color="warning">
      <TaxCalculatorContent />
    </WidgetWrapper>
  );
}
