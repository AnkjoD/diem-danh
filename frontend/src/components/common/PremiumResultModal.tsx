"use client"

import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Button,
  alpha,
  Divider,
  Grid,
  Avatar,
  IconButton,
  useTheme
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import GroupIcon from '@mui/icons-material/Group';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { PremiumScrollContainer } from './PremiumScrollContainer';

interface ResultItem {
  student_name: string;
  student_code: string;
  status: 'present' | 'late' | 'absent';
  confidence: number;
}

interface PremiumResultModalProps {
  open: boolean;
  onClose: () => void;
  results: ResultItem[];
  totalStudents: number;
}

export const PremiumResultModal = ({
  open,
  onClose,
  results,
  totalStudents
}: PremiumResultModalProps) => {
  const theme = useTheme();
  const presentCount = results.filter(r => r.status === 'present' || r.status === 'late').length;
  const successRate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          backgroundColor: alpha('#120a1c', 0.6),
          backdropFilter: 'blur(32px)',
          border: `1px solid ${alpha('#fff', 0.08)}`,
          backgroundImage: 'none',
          overflow: 'hidden',
          boxShadow: `0 40px 100px -20px rgba(0,0,0,0.8), 0 0 40px ${alpha(theme.palette.primary.main, 0.1)}`
        }
      }}
    >
      <Box sx={{ position: 'relative' }}>
         {/* DECORATIVE TOP BAR */}
         <Box sx={{ 
            height: 4, 
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            boxShadow: `0 0 20px ${theme.palette.primary.main}`
         }} />
         
         <IconButton 
            onClick={onClose} 
            sx={{ position: 'absolute', top: 12, right: 12, color: alpha('#fff', 0.2), '&:hover': { color: '#fff' } }}
         >
            <CloseIcon />
         </IconButton>

         <DialogContent sx={{ p: 5, pt: 6 }}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
               <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
               >
                  <Box sx={{ 
                     display: 'inline-flex', p: 2, borderRadius: '50%', mb: 3,
                     bgcolor: alpha('#22c55e', 0.1), border: `2px solid ${alpha('#22c55e', 0.2)}`,
                     color: '#22c55e'
                  }}>
                     <DoneAllIcon sx={{ fontSize: 48 }} />
                  </Box>
               </motion.div>
               <Typography variant="h4" sx={{ fontWeight: 900, mb: 1.5, letterSpacing: '-0.02em' }}>
                  Session Synchronized
               </Typography>
               <Typography variant="body2" sx={{ color: alpha('#fff', 0.3), fontWeight: 700, letterSpacing: '0.1em' }}>
                  ATTENDANCE DATA PROCESSED SUCCESSFULLY
               </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, mb: 6 }}>
               {[
                  { label: 'PRESENT', value: presentCount, color: '#22c55e' },
                  { label: 'ABSENT', value: totalStudents - presentCount, color: '#f43f5e' },
                  { label: 'EFFICIENCY', value: `${Math.round(successRate)}%`, color: theme.palette.primary.main },
               ].map((stat, idx) => (
                  <Box key={idx}>
                     <Box sx={{ textAlign: 'center', p: 2, borderRadius: 3, bgcolor: alpha('#fff', 0.02), border: `1px solid ${alpha('#fff', 0.03)}` }}>
                        <Typography variant="caption" sx={{ color: alpha('#fff', 0.2), fontWeight: 900, display: 'block', mb: 1, fontSize: '0.65rem' }}>
                           {stat.label}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: stat.color }}>
                           {stat.value}
                        </Typography>
                     </Box>
                  </Box>
               ))}
            </Box>

            <Divider sx={{ mb: 4, opacity: 0.05 }} />

            <Typography variant="overline" sx={{ color: alpha('#fff', 0.2), fontWeight: 900, mb: 2, display: 'block' }}>
               DETAILED TELEMETRY
            </Typography>

            <PremiumScrollContainer maxHeight="320px">
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {results.map((res, idx) => (
                     <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                     >
                        <Box sx={{ 
                           p: 2, borderRadius: 2.5, 
                           bgcolor: alpha('#fff', 0.01), 
                           border: `1px solid ${alpha('#fff', 0.03)}`,
                           display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                           <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                                 {res.student_name[0]}
                              </Avatar>
                              <Box>
                                 <Typography variant="body2" sx={{ fontWeight: 800 }}>{res.student_name}</Typography>
                                 <Typography variant="caption" sx={{ color: alpha('#fff', 0.2), fontWeight: 700 }}>{res.student_code}</Typography>
                              </Box>
                           </Box>
                           <Box sx={{ textAlign: 'right' }}>
                              <Typography 
                                 variant="caption" 
                                 sx={{ 
                                    fontWeight: 900, 
                                    color: res.status === 'present' ? '#22c55e' : '#f59e0b',
                                    bgcolor: alpha(res.status === 'present' ? '#22c55e' : '#f59e0b', 0.1),
                                    px: 1.5, py: 0.5, borderRadius: 1.5, fontSize: '0.65rem'
                                 }}
                              >
                                 {res.status.toUpperCase()}
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: alpha('#fff', 0.15), fontWeight: 700, fontSize: '0.6rem' }}>
                                 {Math.round(res.confidence * 100)}% Match
                              </Typography>
                           </Box>
                        </Box>
                     </motion.div>
                  ))}
               </Box>
            </PremiumScrollContainer>

            <Box sx={{ mt: 5 }}>
               <Button 
                  fullWidth 
                  variant="contained" 
                  onClick={onClose}
                  sx={{ py: 2, borderRadius: 3, fontWeight: 900, letterSpacing: '0.05em' }}
               >
                  DISMISS OVERLAY
               </Button>
            </Box>
         </DialogContent>
      </Box>
    </Dialog>
  );
};
